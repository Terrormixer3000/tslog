import { hostname } from "os";
import { normalize as fileNormalize } from "path";
import { inspect, formatWithOptions } from "util";
import { LoggerHelper } from "./LoggerHelper";
/**
 * 📝 Expressive TypeScript Logger for Node.js
 * @public
 */
export class LoggerWithoutCallSite {
    /**
     * @param settings - Configuration of the logger instance  (all settings are optional with sane defaults)
     * @param parentSettings - Used internally to
     */
    constructor(settings, parentSettings) {
        var _a;
        this._logLevels = [
            "silly",
            "trace",
            "debug",
            "info",
            "warn",
            "error",
            "fatal",
        ];
        this._minLevelToStdErr = 4;
        this._mySettings = {};
        this._childLogger = [];
        this._callSiteWrapper = (callSite) => callSite;
        this._parentOrDefaultSettings = {
            type: "pretty",
            instanceName: undefined,
            hostname: (_a = parentSettings === null || parentSettings === void 0 ? void 0 : parentSettings.hostname) !== null && _a !== void 0 ? _a : hostname(),
            name: undefined,
            setCallerAsLoggerName: false,
            requestId: undefined,
            minLevel: "silly",
            exposeStack: false,
            exposeErrorCodeFrame: true,
            exposeErrorCodeFrameLinesBeforeAndAfter: 5,
            ignoreStackLevels: 3,
            suppressStdOutput: false,
            overwriteConsole: false,
            colorizePrettyLogs: true,
            logLevelsColors: {
                0: "whiteBright",
                1: "white",
                2: "greenBright",
                3: "blueBright",
                4: "yellowBright",
                5: "redBright",
                6: "magentaBright",
            },
            prettyInspectHighlightStyles: {
                special: "cyan",
                number: "green",
                bigint: "green",
                boolean: "yellow",
                undefined: "red",
                null: "red",
                string: "red",
                symbol: "green",
                date: "magenta",
                name: "white",
                regexp: "red",
                module: "underline",
            },
            prettyInspectOptions: {
                colors: true,
                compact: false,
                depth: Infinity,
            },
            jsonInspectOptions: {
                colors: false,
                compact: true,
                depth: Infinity,
            },
            delimiter: " ",
            dateTimePattern: undefined,
            // local timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            dateTimeTimezone: undefined,
            prefix: [],
            maskValuesOfKeys: ["password"],
            maskAnyRegEx: [],
            maskPlaceholder: "[***]",
            printLogMessageInNewLine: false,
            // display settings
            displayDateTime: true,
            displayLogLevel: true,
            displayInstanceName: false,
            displayLoggerName: true,
            displayRequestId: true,
            displayFilePath: "hideNodeModulesOnly",
            displayFunctionName: true,
            displayTypes: false,
            stdOut: process.stdout,
            stdErr: process.stderr,
            attachedTransports: [],
        };
        const mySettings = settings != null ? settings : {};
        this.setSettings(mySettings, parentSettings);
        LoggerHelper.initErrorToJsonHelper();
    }
    /** Readonly settings of the current logger instance. Used for testing. */
    get settings() {
        const myPrefix = this._mySettings.prefix != null ? this._mySettings.prefix : [];
        return {
            ...this._parentOrDefaultSettings,
            ...this._mySettings,
            prefix: [...this._parentOrDefaultSettings.prefix, ...myPrefix],
        };
    }
    /**
     *  Change settings during runtime
     *  Changes will be propagated to potential child loggers
     *
     * @param settings - Settings to overwrite with. Only this settings will be overwritten, rest will remain the same.
     * @param parentSettings - INTERNAL USE: Is called by a parent logger to propagate new settings.
     */
    setSettings(settings, parentSettings) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        this._mySettings = {
            ...this._mySettings,
            ...settings,
        };
        if (((_a = this.settings.prettyInspectOptions) === null || _a === void 0 ? void 0 : _a.colors) != null ||
            ((_b = this.settings.prettyInspectOptions) === null || _b === void 0 ? void 0 : _b.colors) === true) {
            this.settings.prettyInspectOptions.colors =
                this.settings.colorizePrettyLogs;
        }
        this._mySettings.instanceName =
            (_c = this._mySettings.instanceName) !== null && _c !== void 0 ? _c : this._mySettings.hostname;
        this._mySettings.name =
            (_d = this._mySettings.name) !== null && _d !== void 0 ? _d : (this._mySettings.setCallerAsLoggerName
                ? (_k = (_g = (_f = (_e = LoggerHelper.getCallSites()) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.getTypeName()) !== null && _g !== void 0 ? _g : (_j = (_h = LoggerHelper.getCallSites()) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.getFunctionName()) !== null && _k !== void 0 ? _k : undefined
                : undefined);
        if (parentSettings != null) {
            this._parentOrDefaultSettings = {
                ...this._parentOrDefaultSettings,
                ...parentSettings,
            };
        }
        this._maskAnyRegExp =
            ((_l = this.settings.maskAnyRegEx) === null || _l === void 0 ? void 0 : _l.length) > 0
                ? // eslint-disable-next-line @rushstack/security/no-unsafe-regexp
                    new RegExp(Object.values(this.settings.maskAnyRegEx).join("|"), "g")
                : undefined;
        LoggerHelper.setUtilsInspectStyles(this.settings.prettyInspectHighlightStyles);
        if (this.settings.overwriteConsole) {
            LoggerHelper.overwriteConsole(this, this._handleLog);
        }
        this._childLogger.forEach((childLogger) => {
            childLogger.setSettings({}, this.settings);
        });
        return this.settings;
    }
    /**
     *  Returns a child logger based on the current instance with inherited settings
     *
     * @param settings - Overwrite settings inherited from parent logger
     */
    getChildLogger(settings) {
        const childSettings = {
            ...this.settings,
        };
        const childLogger = new this.constructor(settings, childSettings);
        this._childLogger.push(childLogger);
        return childLogger;
    }
    /**
     *  Attaches external Loggers, e.g. external log services, file system, database
     *
     * @param transportLogger - External logger to be attached. Must implement all log methods.
     * @param minLevel        - Minimum log level to be forwarded to this attached transport logger. (e.g. debug)
     */
    attachTransport(transportLogger, minLevel = "silly") {
        this.settings.attachedTransports.push({
            minLevel,
            transportLogger,
        });
    }
    /**
     * Logs a silly message.
     * @param args  - Multiple log attributes that should be logged out.
     */
    silly(...args) {
        return this._handleLog.apply(this, ["silly", args]);
    }
    /**
     * Logs a trace message.
     * @param args  - Multiple log attributes that should be logged out.
     */
    trace(...args) {
        return this._handleLog.apply(this, ["trace", args, true]);
    }
    /**
     * Logs a debug message.
     * @param args  - Multiple log attributes that should be logged out.
     */
    debug(...args) {
        return this._handleLog.apply(this, ["debug", args]);
    }
    /**
     * Logs an info message.
     * @param args  - Multiple log attributes that should be logged out.
     */
    info(...args) {
        return this._handleLog.apply(this, ["info", args]);
    }
    /**
     * Logs a warn message.
     * @param args  - Multiple log attributes that should be logged out.
     */
    warn(...args) {
        return this._handleLog.apply(this, ["warn", args]);
    }
    /**
     * Logs an error message.
     * @param args  - Multiple log attributes that should be logged out.
     */
    error(...args) {
        return this._handleLog.apply(this, ["error", args]);
    }
    /**
     * Logs a fatal message.
     * @param args  - Multiple log attributes that should be logged out.
     */
    fatal(...args) {
        return this._handleLog.apply(this, ["fatal", args]);
    }
    /**
     * Helper: Pretty print error without logging it
     * @param error - Error object
     * @param print - Print the error or return only? (default: true)
     * @param exposeErrorCodeFrame  - Should the code frame be exposed? (default: true)
     * @param exposeStackTrace  - Should the stack trace be exposed? (default: true)
     * @param stackOffset - Offset lines of the stack trace (default: 0)
     * @param stackLimit  - Limit number of lines of the stack trace (default: Infinity)
     * @param std - Which std should the output be printed to? (default: stdErr)
     */
    prettyError(error, print = true, exposeErrorCodeFrame = true, exposeStackTrace = true, stackOffset = 0, stackLimit = Infinity, std = this.settings.stdErr) {
        const errorObject = this._buildErrorObject(error, exposeErrorCodeFrame, stackOffset, stackLimit);
        if (print) {
            this._printPrettyError(std, errorObject, exposeStackTrace);
        }
        return errorObject;
    }
    _handleLog(logLevel, logArguments, exposeStack = this.settings.exposeStack) {
        const logObject = this._buildLogObject(logLevel, logArguments, exposeStack);
        if (!this.settings.suppressStdOutput &&
            logObject.logLevelId >= this._logLevels.indexOf(this.settings.minLevel)) {
            const std = logObject.logLevelId < this._minLevelToStdErr
                ? this.settings.stdOut
                : this.settings.stdErr;
            if (this.settings.type === "pretty") {
                this.printPrettyLog(std, logObject);
            }
            else if (this.settings.type === "json") {
                this._printJsonLog(std, logObject);
            }
            else {
                // don't print (e.g. "hidden")
            }
        }
        this.settings.attachedTransports.forEach((transport) => {
            if (logObject.logLevelId >=
                Object.values(this._logLevels).indexOf(transport.minLevel)) {
                transport.transportLogger[logLevel](logObject);
            }
        });
        return logObject;
    }
    _buildLogObject(logLevel, logArguments, exposeStack = true) {
        const callSites = LoggerHelper.getCallSites();
        const relevantCallSites = callSites.splice(this.settings.ignoreStackLevels);
        const stackFrame = relevantCallSites[0] != null
            ? this._callSiteWrapper(relevantCallSites[0])
            : undefined;
        const stackFrameObject = stackFrame != null
            ? LoggerHelper.toStackFrameObject(stackFrame)
            : undefined;
        const requestId = this.settings.requestId instanceof Function
            ? this.settings.requestId()
            : this.settings.requestId;
        const logObject = {
            instanceName: this.settings.instanceName,
            loggerName: this.settings.name,
            hostname: this.settings.hostname,
            requestId,
            date: new Date(),
            logLevel: logLevel,
            logLevelId: this._logLevels.indexOf(logLevel),
            filePath: stackFrameObject === null || stackFrameObject === void 0 ? void 0 : stackFrameObject.filePath,
            fullFilePath: stackFrameObject === null || stackFrameObject === void 0 ? void 0 : stackFrameObject.fullFilePath,
            fileName: stackFrameObject === null || stackFrameObject === void 0 ? void 0 : stackFrameObject.fileName,
            lineNumber: stackFrameObject === null || stackFrameObject === void 0 ? void 0 : stackFrameObject.lineNumber,
            columnNumber: stackFrameObject === null || stackFrameObject === void 0 ? void 0 : stackFrameObject.columnNumber,
            isConstructor: stackFrameObject === null || stackFrameObject === void 0 ? void 0 : stackFrameObject.isConstructor,
            functionName: stackFrameObject === null || stackFrameObject === void 0 ? void 0 : stackFrameObject.functionName,
            typeName: stackFrameObject === null || stackFrameObject === void 0 ? void 0 : stackFrameObject.typeName,
            methodName: stackFrameObject === null || stackFrameObject === void 0 ? void 0 : stackFrameObject.methodName,
            argumentsArray: [],
            toJSON: () => this._logObjectToJson(logObject),
        };
        const logArgumentsWithPrefix = [
            ...this.settings.prefix,
            ...logArguments,
        ];
        logArgumentsWithPrefix.forEach((arg) => {
            if (arg != null && typeof arg === "object" && LoggerHelper.isError(arg)) {
                logObject.argumentsArray.push(this._buildErrorObject(arg, this.settings.exposeErrorCodeFrame));
            }
            else {
                logObject.argumentsArray.push(arg);
            }
        });
        if (exposeStack) {
            logObject.stack = this._toStackObjectArray(relevantCallSites);
        }
        return logObject;
    }
    _buildErrorObject(error, exposeErrorCodeFrame = true, stackOffset = 0, stackLimit = Infinity) {
        var _a, _b;
        const errorCallSites = LoggerHelper.getCallSites(error);
        stackOffset = stackOffset > -1 ? stackOffset : 0;
        const relevantCallSites = (_a = ((errorCallSites === null || errorCallSites === void 0 ? void 0 : errorCallSites.splice) && errorCallSites.splice(stackOffset))) !== null && _a !== void 0 ? _a : [];
        stackLimit = stackLimit > -1 ? stackLimit : 0;
        if (stackLimit < Infinity) {
            relevantCallSites.length = stackLimit;
        }
        const { 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        name: _name, ...errorWithoutName } = error;
        const errorObject = {
            nativeError: error,
            details: { ...errorWithoutName },
            name: (_b = error.name) !== null && _b !== void 0 ? _b : "Error",
            isError: true,
            message: error.message,
            stack: this._toStackObjectArray(relevantCallSites),
        };
        if (errorObject.stack.length > 0) {
            const errorCallSite = LoggerHelper.toStackFrameObject(this._callSiteWrapper(relevantCallSites[0]));
            if (exposeErrorCodeFrame && errorCallSite.lineNumber != null) {
                if (errorCallSite.fullFilePath != null &&
                    errorCallSite.fullFilePath.indexOf("node_modules") < 0) {
                    errorObject.codeFrame = LoggerHelper._getCodeFrame(errorCallSite.fullFilePath, errorCallSite.lineNumber, errorCallSite === null || errorCallSite === void 0 ? void 0 : errorCallSite.columnNumber, this.settings.exposeErrorCodeFrameLinesBeforeAndAfter);
                }
            }
        }
        return errorObject;
    }
    _toStackObjectArray(jsStack) {
        const stackFrame = Object.values(jsStack).reduce((stackFrameObj, callsite) => {
            stackFrameObj.push(LoggerHelper.toStackFrameObject(this._callSiteWrapper(callsite)));
            return stackFrameObj;
        }, []);
        return stackFrame;
    }
    /**
     * Pretty print the log object to the designated output.
     *
     * @param std - output where to pretty print the object
     * @param logObject - object to pretty print
     **/
    printPrettyLog(std, logObject) {
        var _a, _b;
        if (this.settings.displayDateTime === true) {
            let nowStr = "";
            if (this.settings.dateTimePattern != null ||
                this.settings.dateTimeTimezone != null) {
                const dateTimePattern = (_a = this.settings.dateTimePattern) !== null && _a !== void 0 ? _a : "year-month-day hour:minute:second.millisecond";
                const dateTimeTimezone = (_b = this.settings.dateTimeTimezone) !== null && _b !== void 0 ? _b : "utc";
                const dateTimeParts = [
                    ...new Intl.DateTimeFormat("en", {
                        weekday: undefined,
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hourCycle: "h23",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        timeZone: dateTimeTimezone,
                    }).formatToParts(logObject.date),
                    {
                        type: "millisecond",
                        value: ("00" + logObject.date.getMilliseconds()).slice(-3),
                    },
                ];
                nowStr = dateTimeParts.reduce((prevStr, thisStr) => prevStr.replace(thisStr.type, thisStr.value), dateTimePattern);
            }
            else {
                nowStr = new Date().toISOString().replace("T", " ").replace("Z", " ");
            }
            std.write(LoggerHelper.styleString(["gray"], `${nowStr}${this.settings.delimiter}`, this.settings.colorizePrettyLogs));
        }
        if (this.settings.displayLogLevel) {
            const colorName = this.settings.logLevelsColors[logObject.logLevelId];
            std.write(LoggerHelper.styleString([colorName, "bold"], logObject.logLevel.toUpperCase(), this.settings.colorizePrettyLogs) +
                (logObject.logLevel === "info"
                    ? this.settings.delimiter.repeat(2)
                    : this.settings.delimiter));
        }
        const loggerName = this.settings.displayLoggerName === true && logObject.loggerName != null
            ? logObject.loggerName
            : "";
        const instanceName = this.settings.displayInstanceName === true &&
            this.settings.instanceName != null
            ? `@${this.settings.instanceName}`
            : "";
        const traceId = this.settings.displayRequestId === true && logObject.requestId != null
            ? `:${logObject.requestId}`
            : "";
        const name = (loggerName + instanceName + traceId).length > 0
            ? loggerName + instanceName + traceId
            : "";
        const functionName = this.settings.displayFunctionName === true
            ? logObject.isConstructor
                ? ` ${logObject.typeName}.constructor`
                : logObject.methodName != null
                    ? ` ${logObject.typeName}.${logObject.methodName}`
                    : logObject.functionName != null
                        ? ` ${logObject.functionName}`
                        : logObject.typeName !== null
                            ? `${logObject.typeName}.<anonymous>`
                            : ""
            : "";
        let fileLocation = "";
        if (this.settings.displayFilePath === "displayAll" ||
            (this.settings.displayFilePath === "hideNodeModulesOnly" &&
                logObject.filePath != null &&
                logObject.filePath.indexOf("node_modules") < 0)) {
            fileLocation = `${logObject.filePath}:${logObject.lineNumber}`;
        }
        const concatenatedMetaLine = [name, fileLocation, functionName]
            .join(" ")
            .trim();
        if (concatenatedMetaLine.length > 0) {
            std.write(LoggerHelper.styleString(["gray"], `[${concatenatedMetaLine}]`, this.settings.colorizePrettyLogs));
            if (this.settings.printLogMessageInNewLine === false) {
                std.write(`${this.settings.delimiter}`);
            }
            else {
                std.write("\n");
            }
        }
        logObject.argumentsArray.forEach((argument) => {
            const typeStr = this.settings.displayTypes === true
                ? LoggerHelper.styleString(["grey", "bold"], typeof argument + ":", this.settings.colorizePrettyLogs) + this.settings.delimiter
                : "";
            const errorObject = argument;
            if (argument == null) {
                std.write(typeStr +
                    this._inspectAndHideSensitive(argument, this.settings.prettyInspectOptions) +
                    " ");
            }
            else if (typeof argument === "object" &&
                (errorObject === null || errorObject === void 0 ? void 0 : errorObject.isError) === true) {
                this._printPrettyError(std, errorObject);
            }
            else if (typeof argument === "object" &&
                (errorObject === null || errorObject === void 0 ? void 0 : errorObject.isError) !== true) {
                std.write("\n" +
                    typeStr +
                    this._inspectAndHideSensitive(argument, this.settings.prettyInspectOptions));
            }
            else {
                std.write(typeStr +
                    this._formatAndHideSensitive(argument, this.settings.prettyInspectOptions) +
                    this.settings.delimiter);
            }
        });
        std.write("\n");
        if (logObject.stack != null) {
            std.write(LoggerHelper.styleString(["underline", "bold"], "log stack:\n", this.settings.colorizePrettyLogs));
            //this._printUsefulStack(std, logObject.stack)
            //hier nicht möglich, da hier kein natives Error Object vorhanden ist
            //aber auch nicht tragisch, da diese Funktion hier nur aufgerufen wird, wenn von tslog ein stacktrace ausgegeben werden soll,
            //der nicht von einem Error Object bereits vorhanden ist (logger.trace oder exposeStack = true)
            this._printPrettyStack(std, logObject.stack);
        }
    }
    _printPrettyError(std, errorObject, printStackTrace = true) {
        var _a;
        std.write("\n" +
            LoggerHelper.styleString(["bgRed", "whiteBright", "bold"], ` ${errorObject.name}${this.settings.delimiter}`, this.settings.colorizePrettyLogs) +
            (errorObject.message != null
                ? `${this.settings.delimiter}${this._formatAndHideSensitive(errorObject.message, this.settings.prettyInspectOptions)}`
                : ""));
        if (Object.values(errorObject.details).length > 0) {
            std.write(LoggerHelper.styleString(["underline", "bold"], "\ndetails:", this.settings.colorizePrettyLogs));
            std.write("\n" +
                this._inspectAndHideSensitive(errorObject.details, this.settings.prettyInspectOptions));
        }
        if (printStackTrace === true && ((_a = errorObject === null || errorObject === void 0 ? void 0 : errorObject.stack) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            std.write(LoggerHelper.styleString(["underline", "bold"], "\nerror stack:", this.settings.colorizePrettyLogs));
            this._printUsefulStack(std, errorObject.nativeError.stack);
            //this._printPrettyStack(std, errorObject.stack);
        }
        if (errorObject.codeFrame != null) {
            this._printPrettyCodeFrame(std, errorObject.codeFrame);
        }
    }
    _printUsefulStack(std, stack) {
        std.write("\n");
        if (stack !== undefined) {
            std.write(stack);
        }
        else {
            std.write("you should see here an error stack...");
        }
        std.write("\n\n");
    }
    _printPrettyStack(std, stackObjectArray) {
        std.write("\n");
        Object.values(stackObjectArray).forEach((stackObject) => {
            var _a;
            std.write(LoggerHelper.styleString(["gray"], "• ", this.settings.colorizePrettyLogs));
            if (stackObject.fileName != null) {
                std.write(LoggerHelper.styleString(["yellowBright"], stackObject.fileName, this.settings.colorizePrettyLogs));
            }
            if (stackObject.lineNumber != null) {
                std.write(LoggerHelper.styleString(["gray"], ":", this.settings.colorizePrettyLogs));
                std.write(LoggerHelper.styleString(["yellow"], stackObject.lineNumber, this.settings.colorizePrettyLogs));
            }
            std.write(LoggerHelper.styleString(["white"], " " + ((_a = stackObject.functionName) !== null && _a !== void 0 ? _a : "<anonymous>"), this.settings.colorizePrettyLogs));
            if (stackObject.filePath != null &&
                stackObject.lineNumber != null &&
                stackObject.columnNumber != null) {
                std.write("\n    ");
                std.write(fileNormalize(LoggerHelper.styleString(["gray"], `${stackObject.filePath}:${stackObject.lineNumber}:${stackObject.columnNumber}`, this.settings.colorizePrettyLogs)));
            }
            std.write("\n\n");
        });
    }
    _printPrettyCodeFrame(std, codeFrame) {
        std.write(LoggerHelper.styleString(["underline", "bold"], "code frame:\n", this.settings.colorizePrettyLogs));
        let lineNumber = codeFrame.firstLineNumber;
        codeFrame.linesBefore.forEach((line) => {
            std.write(`  ${LoggerHelper.lineNumberTo3Char(lineNumber)} | ${line}\n`);
            lineNumber++;
        });
        std.write(LoggerHelper.styleString(["red"], ">", this.settings.colorizePrettyLogs) +
            " " +
            LoggerHelper.styleString(["bgRed", "whiteBright"], LoggerHelper.lineNumberTo3Char(lineNumber), this.settings.colorizePrettyLogs) +
            " | " +
            LoggerHelper.styleString(["yellow"], codeFrame.relevantLine, this.settings.colorizePrettyLogs) +
            "\n");
        lineNumber++;
        if (codeFrame.columnNumber != null) {
            const positionMarker = new Array(codeFrame.columnNumber + 8).join(" ") + `^`;
            std.write(LoggerHelper.styleString(["red"], positionMarker, this.settings.colorizePrettyLogs) + "\n");
        }
        codeFrame.linesAfter.forEach((line) => {
            std.write(`  ${LoggerHelper.lineNumberTo3Char(lineNumber)} | ${line}\n`);
            lineNumber++;
        });
    }
    _logObjectToJson(logObject) {
        return {
            ...logObject,
            argumentsArray: logObject.argumentsArray.map((argument) => {
                const errorObject = argument;
                if (typeof argument === "object" && (errorObject === null || errorObject === void 0 ? void 0 : errorObject.isError)) {
                    return {
                        ...errorObject,
                        nativeError: undefined,
                        errorString: this._formatAndHideSensitive(errorObject.nativeError, this.settings.jsonInspectOptions),
                    };
                }
                else if (typeof argument === "object") {
                    return this._inspectAndHideSensitive(argument, this.settings.jsonInspectOptions);
                }
                else {
                    return this._formatAndHideSensitive(argument, this.settings.jsonInspectOptions);
                }
            }),
        };
    }
    _printJsonLog(std, logObject) {
        std.write(JSON.stringify(logObject) + "\n");
    }
    _inspectAndHideSensitive(object, inspectOptions) {
        let formatted;
        try {
            const maskedObject = this._maskValuesOfKeys(object);
            formatted = inspect(maskedObject, inspectOptions);
        }
        catch {
            formatted = inspect(object, inspectOptions);
        }
        return this._maskAny(formatted);
    }
    _formatAndHideSensitive(formatParam, inspectOptions, ...param) {
        return this._maskAny(formatWithOptions(inspectOptions, formatParam, ...param));
    }
    _maskValuesOfKeys(object) {
        return LoggerHelper.logObjectMaskValuesOfKeys(object, this.settings.maskValuesOfKeys, this.settings.maskPlaceholder);
    }
    _maskAny(str) {
        const formattedStr = str;
        return this._maskAnyRegExp != null
            ? formattedStr.replace(this._maskAnyRegExp, this.settings.maskPlaceholder)
            : formattedStr;
    }
}
//# sourceMappingURL=LoggerWithoutCallSite.js.map