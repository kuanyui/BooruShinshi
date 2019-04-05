import { MyStorage, msgManager, isUrlSupported } from "./common";


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
        console.log(tabId, changeInfo)
        if (isUrlSupported(changeInfo.url)) {
            browser.pageAction.show(tabId)
        } else {
            browser.pageAction.hide(tabId)
        }
    }
});
