module.exports = {
    ArgumentError: ArgumentError,
    InterfaceError: InterfaceError,
    ScriptExecutionError: ScriptExecutionError
};

function ArgumentError(message) {
    this.name = 'ArgumentError';
    this.__proto__ = new Error(message);
}
function InterfaceError(message) {
    this.name = 'InterfaceError';
    this.__proto__ = new Error(message);
}
function ScriptExecutionError(message) {
    this.name = 'ScriptExecutionError';
    this.__proto__ = new Error(message);
}