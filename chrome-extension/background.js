
async function saveBookmark(url, title) {
    const bookmark = {
        url,
        title,
        description: '',
        notes: '',
        tag_names: [],
        unread: true,
        shared: false,
    };

    const configuration = await chrome.storage.sync.get(['baseUrl', 'token']);
    console.log('configuration', configuration)

    return fetch(`${configuration.baseUrl}/api/bookmarks/`, {
        method: "POST",
        headers: {
            Authorization: `Token ${configuration.token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(bookmark),
    }).then((response) => {
        if (response.status === 201) {
            return response.json();
        } else if (response.status === 400) {
            return response
                .json()
                .then((body) => {
                    console.error(body)
                    Promise.reject(`Validation error: ${JSON.stringify(body)}`)
                });
        } else {
            console.error(response.statusText)
            return Promise.reject(`Request error: ${response.statusText}`);
        }
    })
}

// When the user clicks on the extension action
chrome.action.onClicked.addListener(async (tab) => {
    await chrome.action.setBadgeText({tabId: tab.id, text: 'ing'});
    saveBookmark(tab.url, tab.title).then(() => {
        console.log("saved!!", tab);
        return chrome.action.setBadgeText({tabId: tab.id, text: 'done'});
    }).catch(err => {
        console.error(err);
        return chrome.action.setBadgeText({tabId: tab.id, text: 'err'});
    })
});

