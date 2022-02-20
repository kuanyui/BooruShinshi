import { MyStorage, msgManager, isUrlSupported, MyMsg, MyMsg_DownloadLinkGotten } from "./common";
import sanitizeFilename from 'sanitize-filename'
import { MyOptions, objectAssignPerfectly, storageManager } from "./options";


/** This can be modify */
const STORAGE: MyOptions = storageManager.getDefaultData()

// Storage
console.log('[background] first time to get config from storage')
storageManager.getData().then((obj) => {
    objectAssignPerfectly(STORAGE, obj)
  })

  storageManager.onDataChanged(async (changes) => {
    console.log('[background] storage changed!', changes)
    objectAssignPerfectly(STORAGE, await storageManager.getData())
})


function askTabDownloadImage (tab: browser.tabs.Tab) {
    if (tab.id === undefined) {return}
    msgManager.sendToTab(tab.id, { type: 'AskTabToDownload' })  // FIXME: Is this still needed?
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

browser.runtime.onMessage.addListener((_msg: any, sender: browser.runtime.MessageSender) => {
    const msg = _msg as MyMsg
    console.log('msg from content_script: ', msg)
    if (msg.type === 'DownloadLinkGotten') {
        const safeFilename = sanitizeFilenameForCurrentOs(msg.filename)
        console.log('sanitized filename =', safeFilename)
        browser.downloads.download({
            url: msg.url,
            filename: safeFilename,
            saveAs: false,
            conflictAction: 'uniquify',
        }).then((id) => {
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

// Sanitize filename for Android.
// https://hg.mozilla.org/mozilla-central/rev/b3e21f09ee45#l1.86
// See gConvertToSpaceRegExp
// https://searchfox.org/mozilla-central/source/toolkit/components/downloads/DownloadPaths.jsm#26
export function sanitizeFilenameForCurrentOs (filename: string): string {
    let fin: string = filename
    switch (__OS__) {
        case 'android': {
            fin = fin.replace(/\[/g, '{')
            fin = fin.replace(/\]/g, '}')
            fin = fin.replace(/[\x00-\x1f\x7f-\x9f:*?|"<>;,+=\[\]]+/g, ' ')
            break
        }
    }
    return sanitizeFilename(fin)
}