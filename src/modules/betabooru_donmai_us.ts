import { AbstractModule, TaggedPostInPostsList } from "./abstract"
import { ALL_TAG_CATEGORY, COMMON_TAG_SELECTOR, FileTags, FileTagsElementClass, generalCollectImageInfoList, makeEmptyFileTags, PaginationInfo, ParsedImageInfo, supported_hostname_t, Tag } from "../common"
import { ModuleDanbooruDonmaiUs } from "./danbooru_donmai_us"


export class ModuleBetabooruDonmaiUs extends ModuleDanbooruDonmaiUs {
    constructor() {
        super()
    }
    hostname(): supported_hostname_t {
        return 'betabooru.donmai.us'
    }
    fullName (): string {
        return 'Betabooru'
    }
    abbrev (): string {
        return 'BBR'
    }
}
