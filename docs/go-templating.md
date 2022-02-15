# Go templating

Notable quirks that can give you headaches:

- dashes (`-`) in the template statements remove all whitespace characters (before or after the statement). The helm formatter will always autoclose with an ending dash. Sometimes you need to remove this ending dash to not break the yaml.

## Differences between helm and helmfile

Both helm and helmfile use go templates, but have some minor differences. Helmfile uses a subset of Helm's features, but also has some custom functionality. Most notable differences:

- helm's `.Files.Get` can be achieved by helmfile's `readFile`
- helm's `.Files.Glob` can be achieved by executing a bash command and parsing the result. (See `helmfile.d/snippets/env.gotmpl`)
- helmfile's `get` can read a nested property with dots and takes an optional default value, which you can see a lot in the top of the `*.gotmpl` files
