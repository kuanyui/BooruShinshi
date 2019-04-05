import Vue from 'vue' 
import App from './App.vue'
import { ENGINES } from '../src/common';
import 'bootstrap/dist/css/bootstrap.min.css';

new Vue({
    el: "#app",
    render: h => h(App)
})