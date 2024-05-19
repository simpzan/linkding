
const saveOptions = () => {
    const baseUrl = document.getElementById('input-base-url').value;
    const token = document.getElementById('input-token').value;
    const configs = { baseUrl, token };
    chrome.storage.sync.set(configs, () => {
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 1000);
    });
};
const restoreOptions = () => {
    chrome.storage.sync.get(['baseUrl', 'token'], configs => {
        document.getElementById('input-base-url').value = configs.baseUrl;
        document.getElementById('input-token').value = configs.token;
    });
};
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
