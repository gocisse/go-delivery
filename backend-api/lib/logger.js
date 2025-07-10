const winston = require("winston")
const path = require("path")
const fs = require("fs")

// Ensure logs directory exists
const logsDir = path.join(__dirname, "../logs")
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
)

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "goexpress-backend" },
  transports: [
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, "backend.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
})

// Add console transport in development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  )
}

module.exports = logger
