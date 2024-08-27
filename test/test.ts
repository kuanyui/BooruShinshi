import * as mocha from 'mocha'
import * as chai from 'chai'
import { deepCopy, deepMergeSubset, deepObjectShaper, DeepPartial } from '../src/common'
import { MyLocalStorageRoot, MY_LOCAL_STORAGE_ROOT_DEFAULT } from '../src/options'


mocha.describe('common.ts', () => {
    mocha.it('deepObjectShaper()  [shape modified, smaller -> larger]', () => {
        const victimRoot: DeepPartial<MyLocalStorageRoot> = {
            options: {
                fileName: {
                    fileNameTemplate: 'DONT_CHANGE_THIS',
                    // @ts-expect-error
                    UNEXPECTED_FIELD: true
                }
            }
        }
        const wishedShapedRoot: MyLocalStorageRoot = deepCopy(MY_LOCAL_STORAGE_ROOT_DEFAULT)
        const shapeModified = deepObjectShaper(victimRoot, deepCopy(wishedShapedRoot))
        chai.assert.isTrue(shapeModified)
        chai.assert.strictEqual(victimRoot.options!.fileName!.fileNameTemplate, 'DONT_CHANGE_THIS')
        chai.assert.notDeepEqual(victimRoot, wishedShapedRoot)
        chai.assert.hasAllDeepKeys(victimRoot, wishedShapedRoot)
    })
    mocha.it('deepObjectShaper()  [shape modified, larger -> smaller]', () => {
        const victimRoot: MyLocalStorageRoot = deepCopy(MY_LOCAL_STORAGE_ROOT_DEFAULT)
        const unchangedVictimRoot: MyLocalStorageRoot = deepCopy(MY_LOCAL_STORAGE_ROOT_DEFAULT)
        const wishedShapedRoot: DeepPartial<MyLocalStorageRoot> = {
            options: {
                fileName: {
                    fileNameTemplate: 'Victim already has value for this field, so the victim should not be modified at all.',
                }
            }
        }
        const shapeModified = deepObjectShaper(victimRoot, deepCopy(wishedShapedRoot))
        chai.assert.isTrue(shapeModified)
        chai.assert.notDeepEqual(victimRoot, wishedShapedRoot)
        chai.assert.notDeepEqual(victimRoot, unchangedVictimRoot)
        chai.assert.hasAllDeepKeys(victimRoot, wishedShapedRoot)
        chai.assert.equal(victimRoot.options.fileName.fileNameTemplate, unchangedVictimRoot.options.fileName.fileNameTemplate)
    })
    mocha.it('deepObjectShaper()  [shape not modified]', () => {
        const victimRoot: MyLocalStorageRoot = deepCopy(MY_LOCAL_STORAGE_ROOT_DEFAULT)
        const wishedShapedRoot: MyLocalStorageRoot = deepCopy(MY_LOCAL_STORAGE_ROOT_DEFAULT)
        victimRoot.options.fileName.fileNameTemplate = 'AAA'
        const shapeModified = deepObjectShaper(victimRoot, wishedShapedRoot)
        chai.assert.isFalse(shapeModified)
        chai.assert.strictEqual(victimRoot.options.fileName.fileNameTemplate, 'AAA')
        chai.assert.notDeepEqual(victimRoot, wishedShapedRoot)
        chai.assert.hasAllDeepKeys(victimRoot, wishedShapedRoot)
    })
    mocha.it('deepObjectShaper()  [storage 0.9.x -> 0.10.x migration error]', () => {
        const storage_0_9_x = {
            "options": {
                "ui": {
                    "showNotificationWhenStartingToDownload": true,
                    "openLinkWithNewTab": true,
                    "buttonForCloseTab": true,
                    "paginationButtons": true,
                    "autoCloseTabAfterDownload": true
                },
                "fileName": {
                    "fileNameMaxCharacterLength": 180,
                    "fileNameTemplate": "[%siteabbrev%](%postid%)[%artist%][%series%][%character%]%generals%",
                    "tagSeparator": ",",
                    "overwriteExisted": false
                },
                "folder": {
                    "downloadFolderName": "__BooruShinshi__",
                    "enableClassify": true,
                    "classifyRules": [
                        {
                            "ruleType": "CustomTagMatcher",
                            "logicGate": "AND",
                            "ifContainsTag": [
                                "hayasaka_ai",
                                "maid"
                            ],
                            "folderName": "hayasaka_ai/maid"
                        }
                    ]
                }
            },
            "apiLevel": 2,
            "statistics": {
                "downloadCount": 0
            }
        }
        const storage_0_10_x = {
            "options": {
                "ui": {
                    "showNotificationWhenStartingToDownload": true,
                    "openLinkWithNewTab": false,
                    "buttonForCloseTab": false,
                    "paginationButtons": true,
                    "autoCloseTabAfterDownload": false
                },
                "ux": {                         // Added since 0.10.x
                    "excludeAiGenerated": false
                },
                "fileName": {
                    "fileNameMaxCharacterLength": 180,
                    "fileNameTemplate": "[%siteabbrev%](%postid%)[%artist%][%series%][%character%]%generals%",
                    "tagSeparator": ",",
                    "overwriteExisted": false
                },
                "folder": {
                    "downloadFolderName": "__BooruShinshi__",
                    "enableClassify": true,
                    "classifyRules": [
                        {
                            "ruleType": "CustomTagMatcher",
                            "logicGate": "AND",
                            "ifContainsTag": [
                                "hayasaka_ai",
                                "maid"
                            ],
                            "folderName": "hayasaka_ai/maid"
                        }
                    ]
                }
            },
            "apiLevel": 2,
            "statistics": {
                "downloadCount": 0
            }
        }
        // @ts-expect-error
        chai.assert.isUndefined(storage_0_9_x.options.ux)
        const shapeModified = deepObjectShaper(storage_0_9_x, storage_0_10_x)
        chai.assert.isTrue(shapeModified)
        // @ts-expect-error
        chai.assert.isObject(storage_0_9_x.options.ux)
        // @ts-expect-error
        chai.assert.isBoolean(storage_0_9_x.options.ux.excludeAiGenerated)
        chai.assert.hasAllDeepKeys(storage_0_9_x, storage_0_10_x)
        chai.assert.notDeepEqual(storage_0_9_x, storage_0_10_x)
        const shapeModified1 = deepObjectShaper(storage_0_9_x, storage_0_10_x)
        chai.assert.isFalse(shapeModified1)
    })
    mocha.it('deepMergeSubset()', () => {
        const oriRoot: MyLocalStorageRoot = deepCopy(MY_LOCAL_STORAGE_ROOT_DEFAULT)
        const expectedRoot: MyLocalStorageRoot = deepCopy(MY_LOCAL_STORAGE_ROOT_DEFAULT)
        chai.assert.deepEqual(oriRoot, expectedRoot)
        expectedRoot.options.fileName.fileNameTemplate = 'foobar'
        const subsetRoot: DeepPartial<MyLocalStorageRoot> = {
            options: {
                fileName: {
                    fileNameTemplate: 'foobar'
                }
            },
        }
        deepMergeSubset(oriRoot, subsetRoot)
        chai.assert.deepEqual(oriRoot, expectedRoot)
    })
})