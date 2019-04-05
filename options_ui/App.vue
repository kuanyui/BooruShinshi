<template lang="pug">
.container
  nav.navbar.navbar-light.bg-light
    a.navbar-brand(href='https://addons.mozilla.org/en-US/firefox/addon/privacy-search-engine-switcher/', target='_blank')
      img.d-inline-block.align-top(src='../img/icon.svg', width='30', height='30', alt='')
      span Booru One Click Downloader
  .container
    p
    h5 Enabled Search Engines


</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({

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
