/**
 * Professional Logger Utility
 * Uses chalk for colored output with consistent formatting
 */

const chalk = require("chalk");

class Logger {
  /**
   * Database logs
   */
  static database(message) {
    const timestamp = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    console.log(
      `${chalk.bgGreen.black(" DATABASE ")} ${chalk.green(
        message
      )} ${chalk.gray(`[${timestamp}]`)}`
    );
  }

  /**
   * Success logs (data operations)
   */
  static success(message) {
    console.log(`${chalk.bgGreen.black(" SUCCESS ")} ${chalk.green(message)}`);
  }

  /**
   * Error logs
   */
  static error(message, error = null) {
    console.log(`${chalk.bgRed.white(" ERROR ")} ${chalk.red(message)}`);
    if (error) {
      console.log(chalk.red(`   ${error.message}`));
    }
  }

  /**
   * Warning logs
   */
  static warning(message) {
    console.log(
      `${chalk.bgYellow.black(" WARNING ")} ${chalk.yellow(message)}`
    );
  }

  /**
   * Info logs (general information)
   */
  static info(message) {
    console.log(`${chalk.bgBlue.white(" INFO ")} ${chalk.blue(message)}`);
  }

  /**
   * Data operation logs (saved, edited, deleted)
   */
  static dataSaved(table, identifier = "") {
    const msg = identifier ? `${table} saved: ${identifier}` : `${table} saved`;
    console.log(`${chalk.bgGreen.black(" DATA ")} ${chalk.green(msg)}`);
  }

  static dataEdited(table, identifier = "") {
    const msg = identifier
      ? `${table} edited: ${identifier}`
      : `${table} edited`;
    console.log(`${chalk.bgCyan.black(" DATA ")} ${chalk.cyan(msg)}`);
  }

  static dataDeleted(table, identifier = "") {
    const msg = identifier
      ? `${table} deleted: ${identifier}`
      : `${table} deleted`;
    console.log(`${chalk.bgMagenta.black(" DATA ")} ${chalk.magenta(msg)}`);
  }

  /**
   * Server startup logs
   */
  static serverStarted(port, environment, host = "0.0.0.0") {
    const localUrl = `http://localhost:${port}`;
    const networkUrl = host === "0.0.0.0" ? `http://0.0.0.0:${port}` : `http://${host}:${port}`;
    console.log(
      `${chalk.bgGreen.black(" SERVER ")} ${chalk.green(
        `Running on ${localUrl}`
      )} ${chalk.gray(`[${environment}]`)}`
    );
    if (host === "0.0.0.0") {
      console.log(
        `${chalk.bgBlue.white(" INFO ")} ${chalk.blue(
          `Network access: ${networkUrl} (accessible from other devices)`
        )}`
      );
    }
  }
}

module.exports = Logger;
