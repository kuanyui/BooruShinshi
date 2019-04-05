import { MyMsg, msgManager } from "./common";

browser.runtime.onMessage.addListener((_ev: any) => {
    const ev = _ev as MyMsg
    if (ev.type === "AskTabToDownload") {
        downloadImage()
        // const res: MyMsg = { type: "Success" }
        // console.log('send to background~', res)
        // return Promise.resolve(res)
    }
})

function downloadImage () {
    const lo = document.querySelector('#lowres') as HTMLLinkElement
    const hi = document.querySelector('#highres') as HTMLLinkElement
    console.log('lo.href', lo.href)
    msgManager.sendToBg({
        type: 'DownloadLinkGotten',
        url: lo.href,
        filename: 'testdownload.jpg'
    })
}

function downloadBlob(filename: string, blob: Blob) {
    const a = document.createElement('a')
    const blobUrl = URL.createObjectURL(blob)
    a.setAttribute('href', blobUrl)
    a.setAttribute('download', filename)
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    // document.body.removeChild(a)
    // URL.revokeObjectURL(blobUrl)
}
