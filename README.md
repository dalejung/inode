Interactive Node.js
-------------------

Modified REPL to behave like `ipython`. 

## Features

*this is a small list...*

**Magics**

`%run path/to/file`

This is modeled after the `%run` magic of `ipython`. 

It differs from `require` in the following ways:

* The file will execute in shell and it's namespace will be merged into `global`.
* The executions will not cache. Each call will re-execute the script.
