# i18-next cleaner

**Find unused i18-next translations in your JavaScript/TypeScript project**

Over time, it's easy to end up with many unused translations. While unused translations don't increase you'r projects bundle size, they are unnecessary clutter you have to deal with when updating translations. 

i18-next cleaner is a CLI tool for finding those translations so you can cleanup your translation config.

## Usage

You can run `i18-next-cleaner` with the following command

```shell
npx i18-next-cleaner
```

It will find your i18-next configuration and read all the translation keys. Then it will try to find those translation keys in the source files of your project.

`i18-next-cleaner` will display the unused translation keys after finishing the analysis.

## Gotchas

`i18-next-cleaner` only supports translations which are directly in you config.



