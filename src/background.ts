import { MyStorage, msgManager, isUrlSupported, MyMsg, MyMsg_DownloadLinkGotten } from "./common";


const STORAGE: MyStorage = {
    fileNameFormat: '({author})[{series}][{character}]{tags}',
    fileNameMaxLength: 63,
    tagSeparator: ','
}

function askTabDownloadImage (tab: browser.tabs.Tab) {
    if (tab.id === undefined) {return}
    msgManager.sendToTab(tab.id, { type: 'AskTabToDownload' })
}

browser.pageAction.onClicked.addListener(function (tab) {
    askTabDownloadImage(tab)
})

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
        // console.log(tabId, changeInfo)
        if (isUrlSupported(changeInfo.url)) {
            browser.pageAction.show(tabId)
        } else {
            browser.pageAction.hide(tabId)
        }
    }
});

browser.runtime.onMessage.addListener((_msg: any) => {
    const msg = _msg as MyMsg
    console.log('msg', msg)
    if (msg.type === 'DownloadLinkGotten') {
        browser.downloads.download({
            url: msg.url,
            filename: msg.filename,
            saveAs: false
        })
    }
})