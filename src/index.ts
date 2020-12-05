import fs, { readFileSync } from 'fs'
import { join } from 'path'
import util from 'util'
import yargs, { Arguments } from 'yargs'

import glob from 'glob'

const globAsync = util.promisify(glob)
const readFileAsync = util.promisify(readFileSync)

interface CLIArguments {
  remove: boolean
}

async function list() {
  return globAsync('**/*.{js,ts}', {
    ignore: ['**/node_modules/**'],
    cwd: '.',
  })
}

async function findConfig() {
  const files = await list()
  console.log(files)
  for (const file of files) {
    const contents = await readFileAsync(file, { encoding: 'utf8' })
    console.log(contents)
  }
}

/*
Find reacti18-next config, read translations and key separators etc.
*/
async function main(args: CLIArguments) {
  console.log('Searching for i18next config...')
  const config = await findConfig()
  if (args.remove) {
    // Find i18next config
    // read keys
    // traverse project to find if keys are used
  }
}

yargs
  .scriptName('reacti18-next-cleaner')
  .usage('$0 <cmd> [args]')
  .command(
    '*',
    'scan your project for unused translations',
    (yargs) => {
      yargs.option('remove', {
        alias: 'r',
        type: 'boolean',
        describe: 'remove unused translations',
      })
    },
    function (argv: Arguments<CLIArguments>) {
      return main({ remove: argv.remove })
    }
  )
  .help().argv
