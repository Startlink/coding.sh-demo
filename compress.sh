#!/bin/bash
uglifyjs static/assets/app.js -m -o static/assets/app.min.js
uglifyjs static/assets/app.js -c -m -o static/assets/app.compress.js
