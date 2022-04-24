import * as mocha from 'mocha'
import * as chai from 'chai'
import { deepCopy, deepMergeSubset, deepObjectShaper, DeepPartial } from '../src/common'
import { MyStorageRoot, MY_STORAGE_ROOT_DEFAULT } from '../src/options'


mocha.describe('common.ts', () => {
    mocha.it('deepObjectShaper()  [shape modified, smaller -> larger]', () => {
        const victimRoot: DeepPartial<MyStorageRoot> = {
            options: {
                fileName: {
                    fileNameTemplate: 'DONT_CHANGE_THIS',
                    // @ts-expect-error
                    UNEXPECTED_FIELD: true
                }
            }
        }
        const wishedShapedRoot: MyStorageRoot = deepCopy(MY_STORAGE_ROOT_DEFAULT)
        const shapeModified = deepObjectShaper(victimRoot, deepCopy(wishedShapedRoot))
        chai.assert.isTrue(shapeModified)
        chai.assert.strictEqual(victimRoot.options!.fileName!.fileNameTemplate, 'DONT_CHANGE_THIS')
        chai.assert.notDeepEqual(victimRoot, wishedShapedRoot)
        chai.assert.hasAllDeepKeys(victimRoot, wishedShapedRoot)
    })
    mocha.it('deepObjectShaper()  [shape modified, larger -> smaller]', () => {
        const victimRoot: MyStorageRoot = deepCopy(MY_STORAGE_ROOT_DEFAULT)
        const unchangedVictimRoot: MyStorageRoot = deepCopy(MY_STORAGE_ROOT_DEFAULT)
        const wishedShapedRoot: DeepPartial<MyStorageRoot> = {
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
        const victimRoot: MyStorageRoot = deepCopy(MY_STORAGE_ROOT_DEFAULT)
        const wishedShapedRoot: MyStorageRoot = deepCopy(MY_STORAGE_ROOT_DEFAULT)
        victimRoot.options.fileName.fileNameTemplate = 'AAA'
        const shapeModified = deepObjectShaper(victimRoot, wishedShapedRoot)
        chai.assert.isFalse(shapeModified)
        chai.assert.strictEqual(victimRoot.options.fileName.fileNameTemplate, 'AAA')
        chai.assert.notDeepEqual(victimRoot, wishedShapedRoot)
        chai.assert.hasAllDeepKeys(victimRoot, wishedShapedRoot)
    })
    mocha.it('deepMergeSubset()', () => {
        const oriRoot: MyStorageRoot = deepCopy(MY_STORAGE_ROOT_DEFAULT)
        const expectedRoot: MyStorageRoot = deepCopy(MY_STORAGE_ROOT_DEFAULT)
        chai.assert.deepEqual(oriRoot, expectedRoot)
        expectedRoot.options.fileName.fileNameTemplate = 'foobar'
        const subsetRoot: DeepPartial<MyStorageRoot> = {
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