
module.exports = {
    name: 'disable',
    async execute(API) {
        await API.setButtonState(true, "disable");
        setTimeout(async () => {
            await API.setButtonState(false, "disable");
        }, 5000)
    }
}