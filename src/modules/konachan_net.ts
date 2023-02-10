import { supported_hostname_t } from "../common"
import { ModuleKonachanCom } from "./konachan_com"


export class ModuleKonachanNet extends ModuleKonachanCom {
    constructor() {
        super()
    }
    hostname(): supported_hostname_t {
        return 'konachan.net'
    }
    fullName (): string {
        return 'Konachan G'
    }
    abbrev (): string {
        return 'KCG'
    }
    containsHentai(): boolean {
        return false
    }
    makeQueryUrl(queryList: string[]): string {
        const fmtted = queryList.filter(x => x).map(x=>x.trim()).join(' ')
        return `https://konachan.net/post?tags=${fmtted}`
    }
}
