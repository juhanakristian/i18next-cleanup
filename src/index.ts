import fs from 'fs'
import { join } from 'path'
import ora from 'ora'
import util from 'util'
import yargs, { Arguments } from 'yargs'

import {
  AST_NODE_TYPES,
  parse,
  TSESTree,
} from '@typescript-eslint/typescript-estree'
import Traverser from 'eslint/lib/shared/traverser'

import glob from 'glob'

const globAsync = util.promisify(glob)
const readFileAsync = util.promisify(fs.readFile)

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
  for (const file of files) {
    const contents = await readFileAsync(file, { encoding: 'utf8' })
    const ast = parse(contents)

    Traverser.traverse(ast, {
      enter(node: TSESTree.Node) {
        switch (node.type) {
          case AST_NODE_TYPES.MemberExpression:
            if (
              node.object.type === 'Identifier' &&
              node.object.name === 'i18next' &&
              node.property.type === 'Identifier' &&
              node.property.name === 'init'
            ) {
              console.log('Found i18next init')
            }
        }
      },
    })
  }
}

/*
Find reacti18-next config, read translations and key separators etc.
*/
async function main(args: CLIArguments) {
  console.log('Searching for i18next config...')
  const spinner = ora('initializing').start()
  const config = await findConfig()

  if (args.remove) {
    // Find i18next config
    // read keys
    // traverse project to find if keys are used
  }

  spinner.stop()
  process.exit(0)
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
