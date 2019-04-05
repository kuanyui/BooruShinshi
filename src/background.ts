import { MyStorage, msgManager, isUrlSupported, MyMsg, MyMsg_DownloadLinkGotten } from "./common";
import * as sanitizeFilename from 'sanitize-filename'

const STORAGE: MyStorage = {
    fileNameFormat: '({author})[{series}][{character}]{tags}',  // site, postid
    fileNameMaxLength: 38,
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
    console.log('msg from content_script: ', msg)
    if (msg.type === 'DownloadLinkGotten') {
        const safeFilename = sanitizeFilename(msg.filename)
        console.log('filename =', msg.filename)
        console.log('sanitized filename =', safeFilename)
        browser.downloads.download({
            url: msg.url,
            filename: msg.filename,
            saveAs: false,
            conflictAction: 'uniquify',
        }).then((id) => {
            console.log('download success, id =', id)
        }).catch((err) => {
            console.error('download failed:', err)
        })
    }
})