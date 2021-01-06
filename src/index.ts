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

function recursivelyGetKeys(
  obj: TSESTree.ObjectExpression,
  path = '',
  keys: string[] = []
) {
  for (const p of obj.properties as any[]) {
    const key = path.length > 0 ? `${path}.${p.key.name}` : p.key.name
    if (p.value.type === 'ObjectExpression') {
      recursivelyGetKeys(p.value, key, keys)
    } else if (p.value.type === 'Literal') {
      keys.push(key)
    }
  }
  return keys
}

async function findConfig() {
  const files = await list()
  for (const file of files) {
    const contents = await readFileAsync(file, { encoding: 'utf8' })
    const ast = parse(contents)

    Traverser.traverse(ast, {
      enter(node: TSESTree.Node) {
        switch (node.type) {
          case AST_NODE_TYPES.CallExpression:
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.object.type === 'Identifier' &&
              node.callee.object.name === 'i18next' &&
              node.callee.property.type === 'Identifier' &&
              node.callee.property.name === 'init'
            ) {
              console.log('Found i18next init')
              if (node.arguments[0].type === 'ObjectExpression') {
                const properties = node.arguments[0].properties
                const resources = properties.find(
                  (p) =>
                    p.type === 'Property' &&
                    p.key.type === 'Identifier' &&
                    p.key.name === 'resources'
                )

                if (resources && resources.type === 'Property') {
                  if (resources.value.type === 'ObjectExpression') {
                    for (const p of resources.value
                      .properties as TSESTree.Property[]) {
                      if (p.value.type === 'ObjectExpression') {
                        const keys = recursivelyGetKeys(p.value)
                        console.log(keys)
                      }
                    }
                  }
                }
              }
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
