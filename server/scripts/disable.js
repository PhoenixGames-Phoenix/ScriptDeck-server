const { setButtonState } = require('../index');

module.exports = {
    name: 'disable',
    async execute() {
        await setButtonState(true, "disable");
        setTimeout(async () => {
            await setButtonState(false, "disable");
        }, 5000)
    }
}