module.exports = {
    ArgumentError: ArgumentError,
};

function ArgumentError(message) {
    this.name = 'ArgumentError';
    this.__proto__ = new Error(message);
}