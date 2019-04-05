<template lang="pug">
.container
  nav.navbar.navbar-light.bg-light
    a.navbar-brand(href='https://addons.mozilla.org/en-US/firefox/addon/privacy-search-engine-switcher/', target='_blank')
      img.d-inline-block.align-top(src='../img/icon.svg', width='30', height='30', alt='')
      span Engine Switcher
  .container
    p
    h5 Enabled Search Engines
    .form-row
      .col-auto
        select.form-control(v-model='selectedEngine' :disabled='disabledEngines.length === 0')
          option(v-for='en in disabledEngines' :value='en') {{ en.name }}
      .col-auto
        button.btn.btn-primary(@click='addEngine', :disabled='!selectedEngine') + Add
  
    table
      thead
        tr
          th Order
          th Name
          th Move
          th Delete
      tbody
        tr(v-for='(en, index) in enabledEngines' :key='en.id')
          td {{ index + 1 }}
          td {{ en.name }}
          td
            span.icon-button(@click='moveUp(index)') &#x25B2;
            span.icon-button(@click='moveDn(index)') &#x25BC;
          td
            span.icon-button(@click='delEngine(index)') &#x2A09;

</template>

<script lang="ts">
import Vue from 'vue'
import { ENGINES, SearchEngine, storageManager } from '../src/common';
export default Vue.extend({
    data (): {
        idOfEnabledEngines: string[],
        selectedEngine: null | SearchEngine
    } {
        return {
            idOfEnabledEngines: [],
            selectedEngine: null,
        }
    },
    computed: {
        enabledEngines (): SearchEngine[] {
            return this.idOfEnabledEngines.map((id): SearchEngine => { 
                const en = ENGINES.find(e => e.id === id)
                return en as SearchEngine
            })
        },
        disabledEngines (): SearchEngine[] {
            return ENGINES.filter(x => !this.idOfEnabledEngines.includes(x.id))
        }
    },
    methods: {
        save () {
            storageManager.setSync({
                enabledEngines: this.idOfEnabledEngines
            })
        },
        addEngine () {
            if (!this.selectedEngine) {return}
            this.idOfEnabledEngines.push(this.selectedEngine.id)
            this.selectedEngine = null
            this.save()
        },
        delEngine (index: number) {
            if (this.idOfEnabledEngines.length === 1) {return}
            this.idOfEnabledEngines.splice(index, 1)
            this.save()
        },
        moveUp (index: number) {
            if (index === 0) {return}
            const a0 = this.idOfEnabledEngines[index - 1]
            const a1 = this.idOfEnabledEngines[index]
            this.idOfEnabledEngines.splice(index - 1, 2, a1, a0)
            this.save()
        },
        moveDn (index: number) {
            if (index === this.idOfEnabledEngines.length - 1) {return}
            const a0 = this.idOfEnabledEngines[index]
            const a1 = this.idOfEnabledEngines[index + 1]
            this.idOfEnabledEngines.splice(index, 2, a1, a0)
            this.save()
        }
    },
    mounted () {
        storageManager.getSync().then((d) => {
            this.idOfEnabledEngines = d.enabledEngines
        })
    },
})
</script>

<style lang="stylus">
table {
    border-collapse: collapse;
    width: 100%;
}

th, td {
    text-align: left;
    width: 33%;
    border-bottom: 1px solid #ddd;
    font-size: 14px;
    padding: 2px 12px;
    vertical-align: middle;
}

tr:hover td {
    background-color: #eee;
}

.icon-button {
    cursor: pointer;
    font-size: 24px;
}
</style>
