function trace(logger, taskId, event, detail = {}) {
  return logger.log("agent", event, { taskId, ...detail }, detail.riskLevel || "low", detail.result || "ok");
}

module.exports = { trace };
