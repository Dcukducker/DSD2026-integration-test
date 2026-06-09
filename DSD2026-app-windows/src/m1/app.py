"""
M1 Flask Web Application — Patient Rehabilitation Frontend.
Provides login/register, session control, real-time data display,
and measurement upload to V2.
"""

from __future__ import annotations

import logging
import threading
import time
from pathlib import Path
from typing import Optional

from flask import Flask, render_template, request, jsonify

from src.m1.api_client import V2ApiClient, format_data_to_measurement_payload

LOGGER = logging.getLogger("m1.app")


def create_app(s2_module, api_client: Optional[V2ApiClient] = None) -> Flask:
    """Create and configure the Flask application.

    Args:
        s2_module: S2Module instance for session control and data reading.
        api_client: V2ApiClient instance. Created with default base URL if None.
    """
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
    )
    app.secret_key = "dsd-s2-m1-dev-key"

    if api_client is None:
        api_client = V2ApiClient()

    app.config["S2_MODULE"] = s2_module
    app.config["API_CLIENT"] = api_client

    _upload_thread: Optional[threading.Thread] = None
    _upload_running = False
    _recording_lock = threading.Lock()  # serializes stop_recording + upload + end_session
    _pending_log_data: Optional[dict] = None  # held between recording-stop and session-stop

    def get_s2():
        return app.config["S2_MODULE"]

    def get_api():
        return app.config["API_CLIENT"]

    def _stop_recording_only() -> dict | None:
        """Stop recording (if still active) and store log_data for later upload.

        Does NOT upload — upload happens at session-stop time.
        Must be called under _recording_lock.
        """
        nonlocal _upload_running, _pending_log_data
        s2_session = get_s2().session
        if not s2_session.is_recording:
            return None
        _upload_running = False
        log_data = s2_session.stop_recording()
        _pending_log_data = log_data
        LOGGER.info(
            "Recording stopped: %d samples, %d angles held for session-stop upload",
            len(log_data.get("sensorData", [])),
            len(log_data.get("targetAngles", [])),
        )
        return log_data

    def _upload_log_data(
        log_data: dict,
        token: str,
        session_id: int,
        batch_size: int = 100,
    ) -> tuple:
        """Upload log_data to V2 in small batches. Returns (uploaded, failed) counts.

        Batches are proportionally split across sensor_data and target_angles
        so every batch contains both data types (V2 may reject angle-less batches).
        Failed batches are retried up to 3 times with backoff and a 0.5s inter-batch delay.

        log_data items are already dicts with ISO 8601 timestamps
        (as stored by DataAcqCore._json_log_data), so they can be
        passed through to upload_measurement() directly.
        """
        uploaded_batches = 0
        upload_errors = 0

        sensor_data = log_data.get("sensorData", [])
        target_angles = log_data.get("targetAngles", [])
        errors = log_data.get("errors", [])

        total_sd = len(sensor_data)
        total_ta = len(target_angles)
        total_err = len(errors)

        if total_sd == 0 and total_ta == 0:
            return 0, 0

        # Number of batches: base on the list with data, cap at what batch_size implies
        max_items = max(total_sd, total_ta)
        n_batches = max(1, (max_items + batch_size - 1) // batch_size)

        for i in range(n_batches):
            # Proportional slicing: each batch covers its share of every list
            sd_s = i * total_sd // n_batches
            sd_e = (i + 1) * total_sd // n_batches
            ta_s = i * total_ta // n_batches
            ta_e = (i + 1) * total_ta // n_batches
            err_s = i * total_err // n_batches
            err_e = (i + 1) * total_err // n_batches

            batch_sd = sensor_data[sd_s:sd_e]
            batch_ta = target_angles[ta_s:ta_e]
            batch_err = errors[err_s:err_e]

            if not batch_sd and not batch_ta:
                continue

            batch_num = i + 1

            # Retry up to 3 times with backoff
            for attempt in range(3):
                try:
                    get_api().upload_measurement(
                        session_id=session_id,
                        target_angles=batch_ta,
                        errors=batch_err,
                        sensor_data=batch_sd,
                        token=token,
                    )
                    uploaded_batches += 1
                    LOGGER.debug(
                        "Batch %d/%d uploaded: %d samples, %d angles",
                        batch_num, n_batches, len(batch_sd), len(batch_ta),
                    )
                    break
                except Exception as exc:
                    resp_body = ""
                    if hasattr(exc, 'response') and exc.response is not None:
                        try:
                            resp_body = exc.response.text[:500]
                        except Exception:
                            pass
                    if attempt < 2:
                        wait = (attempt + 1) * 1.0
                        LOGGER.warning(
                            "Batch %d/%d attempt %d failed (status=%s, body=%s), retrying in %.1fs",
                            batch_num, n_batches, attempt + 1,
                            getattr(getattr(exc, 'response', None), 'status_code', '?'),
                            resp_body, wait,
                        )
                        time.sleep(wait)
                    else:
                        upload_errors += 1
                        LOGGER.error(
                            "Upload batch %d/%d failed after 3 attempts (status=%s, body=%s)",
                            batch_num, n_batches,
                            getattr(getattr(exc, 'response', None), 'status_code', '?'),
                            resp_body,
                        )

            # Small delay between batches to avoid overwhelming V2
            if i < n_batches - 1:
                time.sleep(0.5)

        return uploaded_batches, upload_errors

    # ── Pages ─────────────────────────────────────────────────────

    @app.route("/")
    def index():
        return render_template("index.html")

    # ── Auth API ──────────────────────────────────────────────────

    @app.route("/api/register", methods=["POST"])
    def api_register():
        data = request.get_json()
        try:
            result = get_api().register(
                name=data["name"],
                email=data["email"],
                password=data["password"],
                role=data.get("role", "patient"),
            )
            return jsonify(result), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.route("/api/login", methods=["POST"])
    def api_login():
        data = request.get_json()
        try:
            result = get_api().login(
                email=data["email"], password=data["password"]
            )
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    # ── Session Control API ───────────────────────────────────────

    # ── Data Source Mode API ─────────────────────────────────────

    @app.route("/api/mode", methods=["GET"])
    def api_get_mode():
        """Get current data source mode and availability."""
        s2 = get_s2()
        real_available = s2.session._s1_real is not None
        return jsonify({
            "mode": "simulator" if s2.session.use_simulator else "real",
            "realAvailable": real_available,
        }), 200

    @app.route("/api/mode", methods=["POST"])
    def api_set_mode():
        """Switch data source mode: {"mode": "simulator"} or {"mode": "real"}."""
        data = request.get_json()
        mode = data.get("mode", "")
        try:
            if mode == "simulator":
                get_s2().session.set_mode(True)
            elif mode == "real":
                get_s2().session.set_mode(False)
            else:
                return jsonify({"error": "mode must be 'simulator' or 'real'"}), 400
            return jsonify({"mode": mode}), 200
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 400

    # WitMotion BLE IMU default notify characteristic UUID
    WITMOTION_NOTIFY_UUID = "0000ffe4-0000-1000-8000-00805f9a34fb"

    @app.route("/api/sensors/configure", methods=["POST"])
    def api_configure_sensors():
        """Configure real BLE sensors at runtime.

        Expects: {"addresses": ["AA:BB:CC:DD:EE:F1", "AA:BB:CC:DD:EE:F2"]}
        The notify_char_uuid uses the WitMotion default automatically.
        Creates a real S1 module and makes the 'real' mode available.
        """
        data = request.get_json()
        addresses = data.get("addresses", [])
        if not addresses:
            return jsonify({"error": "addresses list is empty"}), 400

        try:
            from src.s1.ble_tunnel import SensorConfig, ServiceConfig
            from src.s1.service import create_s1_module

            configs = [
                SensorConfig(
                    device_address=addr.strip(),
                    notify_char_uuid=WITMOTION_NOTIFY_UUID,
                )
                for addr in addresses
                if addr.strip()
            ]
            if not configs:
                return jsonify({"error": "no valid addresses provided"}), 400

            s1_real = create_s1_module(configs, ServiceConfig())
            get_s2().session.set_real_s1(s1_real)
            return jsonify({
                "message": f"Configured {len(configs)} BLE sensor(s)",
                "realAvailable": True,
            }), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    # ── Session Control API ───────────────────────────────────────

    @app.route("/api/session/create", methods=["POST"])
    def api_session_create():
        """Create a session on V2, returns server-generated session id."""
        data = request.get_json()
        try:
            result = get_api().create_session(
                user_id=data["userId"], token=data["token"]
            )
            return jsonify(result), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.route("/api/session/start", methods=["POST"])
    def api_session_start():
        """Start data acquisition on S2.

        Expects: {sessionId, userId, sensorJointMapping, payloadStatus}
        """
        data = request.get_json()
        try:
            result = get_s2().session.start(
                sessionId=data["sessionId"],
                userId=data["userId"],
                sensorJointMapping=data.get("sensorJointMapping", {}),
                payloadStatus=data.get("payloadStatus", ""),
            )
            return jsonify({
                "success": result.success,
                "errorMessage": result.errorMessage,
            }), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/session/stop", methods=["POST"])
    def api_session_stop():
        """Stop data acquisition, upload any recorded data, then end session on V2.

        Upload happens HERE (at session-stop time), not at recording-stop time.
        Uses _recording_lock to guarantee upload completes BEFORE end_session.
        """
        nonlocal _pending_log_data
        data = request.get_json()
        token = data.get("token")
        session_id = data.get("sessionId")
        try:
            s2_session = get_s2().session

            uploaded_batches = 0
            upload_errors = 0

            with _recording_lock:
                # If recording still active, stop it now and capture data
                if s2_session.is_recording:
                    _stop_recording_only()

                # Take pending log data for upload
                log_data = _pending_log_data
                _pending_log_data = None

                # Upload recording data (if any) BEFORE ending V2 session
                if log_data and token and session_id:
                    uploaded_batches, upload_errors = _upload_log_data(
                        log_data, token, session_id
                    )
                    LOGGER.info(
                        "Session-stop upload: %d/%d batches",
                        uploaded_batches, uploaded_batches + upload_errors,
                    )

                # End the S2 session
                summary = s2_session.stop()

                # End the V2 session (only after upload completes)
                if token and session_id:
                    try:
                        get_api().end_session(
                            session_id=session_id, token=token
                        )
                    except Exception as v2_err:
                        LOGGER.warning("Failed to end V2 session: %s", v2_err)

            return jsonify({
                "sessionId": summary.sessionId,
                "sampleCount": summary.sampleCount,
                "errorCount": summary.errorCount,
                "startTime": summary.startTime,
                "endTime": summary.endTime,
                "batchesUploaded": uploaded_batches,
                "batchesFailed": upload_errors,
            }), 200
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/session/cancel", methods=["POST"])
    def api_session_cancel():
        """Cancel an active session: stop recording, stop session,
        delete session on V2, and clean up local log files."""
        nonlocal _upload_running, _pending_log_data
        data = request.get_json()
        token = data.get("token")
        session_id = data.get("sessionId")

        s2_session = get_s2().session

        # Capture CSV log path before stopping recording (path is lost after close)
        csv_path = None
        if s2_session.is_recording and s2_session._core is not None:
            angle_log = s2_session._core._angle_log
            if angle_log and "path" in angle_log:
                csv_path = str(angle_log["path"])

        # Serialize with stop/upload handlers
        with _recording_lock:
            # Step 1: Stop recording if active (discard data, no upload)
            if s2_session.is_recording:
                _upload_running = False
                try:
                    s2_session.stop_recording()
                except Exception as e:
                    LOGGER.warning("Error stopping recording during cancel: %s", e)

            # Clear any pending upload data
            _pending_log_data = None

            # Step 2: Stop session
            try:
                if s2_session.is_active:
                    s2_session.stop()
            except Exception as e:
                LOGGER.warning("Error stopping session during cancel: %s", e)

        # Step 3: Delete session on V2
        v2_deleted = False
        if token and session_id:
            try:
                get_api().delete_session(
                    session_id=session_id, token=token
                )
                v2_deleted = True
                LOGGER.info("V2 session %s deleted", session_id)
            except Exception as v2_err:
                LOGGER.warning("Failed to delete V2 session %s: %s", session_id, v2_err)

        # Step 4: Clean up local log files
        cleaned_files = 0
        log_dir = Path("log")

        # Delete CSV angle log
        if csv_path:
            try:
                Path(csv_path).unlink(missing_ok=True)
                cleaned_files += 1
                LOGGER.info("Deleted CSV log: %s", csv_path)
            except Exception:
                pass

        # Delete JSON session log(s) for this session
        if log_dir.exists():
            for f in log_dir.glob(f"session_{session_id}_*.json"):
                try:
                    f.unlink()
                    cleaned_files += 1
                    LOGGER.info("Deleted JSON log: %s", f)
                except Exception:
                    pass

        return jsonify({
            "message": "Session cancelled",
            "sessionId": session_id,
            "v2Deleted": v2_deleted,
            "localFilesCleaned": cleaned_files,
        }), 200

    # ── Recording Control API ─────────────────────────────────────

    @app.route("/api/recording/start", methods=["POST"])
    def api_recording_start():
        """Start recording: begin local data accumulation (no upload until stop)."""
        data = request.get_json()
        token = data.get("token")
        session_id = data.get("sessionId")

        if not token or not session_id:
            return jsonify({"error": "token and sessionId required"}), 400

        try:
            s2_session = get_s2().session
            s2_session.start_recording()
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 400

        return jsonify({
            "message": "Recording started",
            "recordingStartTime": s2_session._core.recording_start_time if s2_session._core else None,
        }), 200

    @app.route("/api/recording/stop", methods=["POST"])
    def api_recording_stop():
        """Stop recording: stop data accumulation (data held for upload at session stop)."""
        with _recording_lock:
            log_data = _stop_recording_only()

        if log_data is None:
            return jsonify({"message": "Not recording", "sampleCount": 0, "angleCount": 0}), 200

        return jsonify({
            "message": "Recording stopped",
            "sampleCount": len(log_data.get("sensorData", [])),
            "angleCount": len(log_data.get("targetAngles", [])),
            "errorCount": len(log_data.get("errors", [])),
        }), 200

    # ── Data Reading API ──────────────────────────────────────────

    @app.route("/api/data/read", methods=["GET"])
    def api_data_read():
        """Read current FormatData from S2."""
        try:
            format_data = get_s2().data.read()
            return jsonify({
                "sessionContext": {
                    "sessionId": format_data.sessionContext.sessionId,
                    "userId": format_data.sessionContext.userId,
                    "sensorJointMapping": format_data.sessionContext.sensorJointMapping,
                    "payloadStatus": format_data.sessionContext.payloadStatus,
                },
                "sensorData": [
                    {
                        "timestamp": s.timestamp,
                        "deviceId": s.deviceId,
                        "deviceName": s.deviceName,
                        "accX": s.accX, "accY": s.accY, "accZ": s.accZ,
                        "gyroX": s.gyroX, "gyroY": s.gyroY, "gyroZ": s.gyroZ,
                        "roll": s.roll, "pitch": s.pitch, "yaw": s.yaw,
                    }
                    for s in format_data.sensorData
                ],
                "targetAngles": [
                    {"timestamp": ta.timestamp, "angleID": ta.angleID, "angle": ta.angle}
                    for ta in format_data.targetAngles
                ],
                "errors": [
                    {
                        "timestamp": e.timestamp,
                        "sensorId": e.sensorId,
                        "errorType": e.errorType,
                        "message": e.message,
                    }
                    for e in format_data.errors
                ],
            }), 200
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 400

    # ── Measurement Upload API ────────────────────────────────────

    @app.route("/api/measurement/upload", methods=["POST"])
    def api_measurement_upload():
        """Read data from S2 and upload to V2 as measurement."""
        data = request.get_json()
        token = data.get("token")
        session_id = data.get("sessionId")

        if not token or not session_id:
            return jsonify({"error": "token and sessionId required"}), 400

        try:
            format_data = get_s2().data.read()
            if not format_data.sensorData and not format_data.targetAngles:
                return jsonify({"message": "No new data to upload"}), 200

            payload = format_data_to_measurement_payload(format_data)
            result = get_api().upload_measurement(
                session_id=session_id,
                target_angles=payload["targetAngles"],
                errors=payload["errors"],
                sensor_data=payload["sensorData"],
                token=token,
            )
            return jsonify(result), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/measurement/auto-upload/start", methods=["POST"])
    def api_auto_upload_start():
        """Start background auto-upload: periodically read S2 data and upload to V2."""
        nonlocal _upload_thread, _upload_running

        data = request.get_json()
        token = data.get("token")
        session_id = data.get("sessionId")
        interval = data.get("interval", 2.0)

        if not token or not session_id:
            return jsonify({"error": "token and sessionId required"}), 400

        if _upload_running:
            return jsonify({"message": "Auto-upload already running"}), 200

        _upload_running = True

        def upload_loop():
            nonlocal _upload_running
            while _upload_running:
                try:
                    if not get_s2().session.is_active:
                        break
                    buf = get_s2().session.buffer
                    if buf is None:
                        break
                    format_data = buf.drain("auto_upload")
                    if format_data.sensorData or format_data.targetAngles:
                        payload = format_data_to_measurement_payload(format_data)
                        get_api().upload_measurement(
                            session_id=session_id,
                            target_angles=payload["targetAngles"],
                            errors=payload["errors"],
                            sensor_data=payload["sensorData"],
                            token=token,
                        )
                        LOGGER.debug(
                            "Auto-uploaded %d samples, %d angles",
                            len(format_data.sensorData),
                            len(format_data.targetAngles),
                        )
                except Exception:
                    LOGGER.exception("Auto-upload error")
                time.sleep(interval)
            _upload_running = False

        _upload_thread = threading.Thread(
            target=upload_loop, daemon=True, name="m1-auto-upload"
        )
        _upload_thread.start()
        return jsonify({"message": "Auto-upload started", "interval": interval}), 200

    @app.route("/api/measurement/auto-upload/stop", methods=["POST"])
    def api_auto_upload_stop():
        nonlocal _upload_running
        _upload_running = False
        return jsonify({"message": "Auto-upload stopped"}), 200

    # ── V2 Query APIs ─────────────────────────────────────────────

    @app.route("/api/session/<int:session_id>", methods=["GET"])
    def api_get_session(session_id):
        token = request.args.get("token", "")
        try:
            result = get_api().get_session(session_id, token)
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.route("/api/recommendations/session/<int:session_id>", methods=["GET"])
    def api_get_recommendations(session_id):
        token = request.args.get("token", "")
        try:
            result = get_api().get_session_recommendations(session_id, token)
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.route("/api/recommendations/engine/<int:user_id>", methods=["GET"])
    def api_get_engine_recommendations(user_id):
        token = request.args.get("token", "")
        try:
            result = get_api().get_engine_recommendations(user_id, token)
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.route("/api/schedule/<int:user_id>", methods=["GET"])
    def api_get_schedule(user_id):
        token = request.args.get("token", "")
        try:
            result = get_api().get_schedule(user_id, token)
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    return app
