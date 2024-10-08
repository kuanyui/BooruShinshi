import { msgManager, MyMsg, MyMsg_DownloadLinkGotten, objectAssignPerfectly, sanitizeFilePath } from "./common"
// import sanitizeFilename from 'sanitize-filename'
import { MyLocalStorageRoot, storageManager } from "./options"

browser.runtime.onInstalled.addListener(function(details){
    if (details.reason === "install"){
        console.log("[browser.runtime.onInstalled] This is a first install!");
    } else if (details.reason === "update") {
        var thisVersion = browser.runtime.getManifest().version
        if (details.previousVersion !== thisVersion) {
            browser.tabs.create({
                url: browser.runtime.getURL('dist/internal_pages/updated.html')
            })
        }
        console.log("[browser.runtime.onInstalled] Updated from " + details.previousVersion + " to " + thisVersion + "!")
    }
})


/** This can be modify */
const STORAGE: MyLocalStorageRoot = storageManager.getDefaultRoot()

// Storage
console.log('[background] first time to get config from storage')
storageManager.initAndGetRoot().then((obj) => {
    objectAssignPerfectly(STORAGE, obj)
    storageManager.onOptionsChanged(async (changes) => {
        console.log('[background] storage changed!', changes)
        objectAssignPerfectly(STORAGE, await storageManager.getRoot())
    })
})



function askTabDownloadImage (tab: browser.tabs.Tab) {
    if (tab.id === undefined) {return}
    msgManager.sendToTab(tab.id, { type: 'AskTabToDownload' })  // FIXME: Is this still needed?
}

browser.pageAction.onClicked.addListener(function (tab) {
    askTabDownloadImage(tab)
})

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    //if (changeInfo.url) {
    //    console.log(tabId, changeInfo)
    //    if (isInPostContentPage(changeInfo.url)) {
    //        browser.pageAction.show(tabId)
    //    } else {
    //        browser.pageAction.hide(tabId)
    //    }
    //}
});
browser.runtime.onMessage.addListener((_msg: any, sender: browser.runtime.MessageSender) => {
    const msg = _msg as MyMsg
    console.log('msg from content_script: ', msg)
    if (msg.type === 'DownloadLinkGotten') {
        const safeFilename = sanitizeFilePathForCurrentOs(msg.filename)
        console.log('sanitized filename =', safeFilename)
        browser.downloads.download({
            url: msg.url,
            filename: safeFilename,
            saveAs: false,
            conflictAction: STORAGE.options.fileName.overwriteExisted ? 'overwrite' : 'uniquify',
            headers: [
                // @ts-expect-error  (Wrong type definition of web-ext?)
                {
                    name: "Referer",
                    value: msg.referer
                },
            ]
        }).then((id) => {
            if (STORAGE.options.ui.autoCloseTabAfterDownload) {
                setTimeout(() => {
                   if (!sender.tab) { return }
                   if (sender.tab.id === undefined) { return }
                    browser.tabs.remove(sender.tab.id)
                }, 500)
            }
            storageManager.getSync('statistics_downloadCount').then((count) => {
                storageManager.setSync('statistics_downloadCount', ++count)
                if (count > 0 && count % 1000 === 0) {
                    browser.tabs.create({
                        url: browser.runtime.getURL('dist/internal_pages/download_count.html')
                    })
                }
            })
            console.log('download success, id =', id)
        }).catch((err) => {
            console.error('download failed:', err)
        })
    } else if (msg.type === 'OpenLinkInNewTab') {
        browser.tabs.create({ active: false, url: msg.url })
    } else if (msg.type === 'CloseTab') {
        if (!sender.tab) { return }
        if (sender.tab.id === undefined) { return }
        browser.tabs.remove(sender.tab.id)
    }
})

let __OS__: browser.runtime.PlatformOs = 'android'
browser.runtime.getPlatformInfo().then(d => {
    __OS__ = d.os

})
browser.browserAction.setTitle({ title: "Settings of Booru Shinshi" })
browser.browserAction.onClicked.addListener((tab) => {
    browser.runtime.openOptionsPage()
})

// Sanitize filename for Android.
// https://hg.mozilla.org/mozilla-central/rev/b3e21f09ee45#l1.86
// See gConvertToSpaceRegExp
// https://searchfox.org/mozilla-central/source/toolkit/components/downloads/DownloadPaths.jsm#26
export function sanitizeFilePathForCurrentOs (filename: string): string {
    let fin: string = filename
    switch (__OS__) {
        case 'android': {
            fin = fin.replace(/\[/g, '{')
            fin = fin.replace(/\]/g, '}')
            fin = fin.replace(/[\x00-\x1f\x7f-\x9f:*?|"<>;,+=\[\]]+/g, ' ')
            break
        }
    }
    return sanitizeFilePath(fin)
}
