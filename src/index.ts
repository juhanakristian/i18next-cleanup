import fs from 'fs'
import util from 'util'
import yargs, { Arguments } from 'yargs'
import chalk from 'chalk'
import termSize from 'term-size'

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
    ignore: ['**/node_modules/**', '**/index.js'],
    cwd: '.',
  })
}

function recursivelyGetKeys(
  obj: TSESTree.ObjectExpression,
  path = '',
  keys: string[] = [] // keys is mutated
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

interface UnusedTranslationsResult {
  language: string
  translations: string[]
}

async function findKeys(): Promise<UnusedTranslationsResult[]> {
  const files = await list()
  const results: UnusedTranslationsResult[] = []
  for (const file of files) {
    const contents = await readFileAsync(file, { encoding: 'utf8' })
    const ast = parse(contents, { jsx: true })

    await Traverser.traverse(ast, {
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
              console.log(chalk.blue(`Found i18next init in ${file}`))
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
                      if (
                        p.value.type === 'ObjectExpression' &&
                        p.key.type === 'Identifier'
                      ) {
                        results.push({
                          language: p.key.name,
                          translations: recursivelyGetKeys(p.value),
                        })
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

  return results
}

async function checkUsage(unused: UnusedTranslationsResult[]) {
  const files = await list()
  let keys = Array.from(
    new Set(
      unused.reduce((result: string[], current: UnusedTranslationsResult) => {
        return result.concat(current.translations)
      }, [])
    )
  )
  for (const file of files) {
    const contents = await readFileAsync(file, { encoding: 'utf8' })
    const ast = parse(contents, { jsx: true })

    Traverser.traverse(ast, {
      enter(node: TSESTree.Node) {
        switch (node.type) {
          case AST_NODE_TYPES.Literal:
            keys = keys.filter((v) => v !== node.value)
            break
        }
      },
    })
  }

  return keys
}

/*
Find reacti18-next config, read translations and key separators etc.
*/
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function main(args: CLIArguments) {
  console.log(chalk.blue('Searching for i18next config...'))
  // const spinner = ora('initializing').start()
  const keys = await findKeys()

  const unused = await checkUsage(keys)

  const { columns } = termSize()

  const divider = chalk.grey('-'.repeat(columns))
  console.log(divider)

  console.log(chalk.red(`Found ${unused.length} unused translations`))

  console.log(divider)
  for (const translation of unused) {
    console.log(chalk.green(`${translation}`))
  }

  // spinner.stop()
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
