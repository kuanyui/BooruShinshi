import { MyMsg } from "./common";

browser.runtime.onMessage.addListener((_ev: any) => {
    const ev = _ev as MyMsg
    if (ev.type === "AskTabToDownload") {
        const res: MyMsg = { type: "Success" }
        console.log('send to background~', res)
        downloadImage()
        return Promise.resolve(res)
    }
})

function downloadImage () {
    const lo = document.querySelector('#lowres') as HTMLLinkElement
    const hi = document.querySelector('#highres') as HTMLLinkElement
    console.log('lo.href', lo.href)
    fetch(lo.href, {
        credentials: 'include',
        mode: 'no-cors'
    }).then((r) => {
        console.log('downloaded!!!', r)
        r.blob().then((blob) => {
            // downloadBlob('testdownload.jpg', blob)
        })
    }).catch(err => {console.error('err', err)})
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