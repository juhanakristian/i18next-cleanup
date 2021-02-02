import fs from 'fs'
import util from 'util'
import yargs from 'yargs'
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

async function list() {
  return globAsync('**/*.{js,ts}', {
    ignore: ['**/node_modules/**', '**/index.js'],
    cwd: '.',
  })
}

function findDeclaration(name: string, file: string) {
  // Read file to AST
  // Try to find VariableDeclaration with name == name
  // If it fails, search for ImportDeclaration with name == name
  // Return Translations or a TSESTree.Node
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

interface Translation {
  language: string
  key: string
}

async function collectTranslations(): Promise<Translation[]> {
  const files = await list()
  const results: Translation[] = []
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
              console.log(chalk.white(`Found i18next init in ${file}`))
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
                        // Found a language with inline translations
                        const translations = recursivelyGetKeys(p.value)
                        for (const translation of translations) {
                          results.push({
                            language: p.key.name,
                            key: translation,
                          })
                        }
                      } else if (
                        p.value.type === 'Identifier' &&
                        p.key.type === 'Identifier'
                      ) {
                        // Found a language with translations defined somewhere else
                        // Search through VariableDeclarations and ImportDeclarations in this file
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

async function checkUsage(translations: Translation[]) {
  const files = await list()
  let unused = Array.from(translations)
  for (const file of files) {
    const contents = await readFileAsync(file, { encoding: 'utf8' })
    const ast = parse(contents, { jsx: true })

    Traverser.traverse(ast, {
      enter(node: TSESTree.Node) {
        switch (node.type) {
          case AST_NODE_TYPES.Literal:
            unused = unused.filter((v) => v.key !== node.value)
            break
        }
      },
    })
  }

  return unused
}

function printResults(unused: Translation[]) {
  const { columns } = termSize()

  const firstColumn = 5
  const secondColumn = columns - firstColumn - 1
  console.log(chalk.red(`\n${unused.length} unused translations`))

  const languages = new Set(
    unused.reduce(
      (acc: string[], translation: Translation) => [
        ...acc,
        translation.language,
      ],
      []
    )
  )

  for (const language of Array.from(languages)) {
    const languageTranslations = unused.filter((t) => t.language === language)

    const lines = [
      chalk.grey('─'.repeat(firstColumn) + '┬' + '─'.repeat(secondColumn)),
      chalk.grey(' '.repeat(firstColumn) + '│ ') + chalk.blue(`${language}`),
      chalk.grey('─'.repeat(firstColumn) + '┼' + '─'.repeat(secondColumn)),
      ...languageTranslations.map(
        (t, index) =>
          chalk.grey(`${index + 1}`.padStart(4, ' ') + ' │ ') +
          chalk.white(t.key)
      ),
      chalk.grey('─'.repeat(firstColumn) + '┴' + '─'.repeat(secondColumn)),
    ]

    console.log(`\n${lines.join('\n')}\n`)
  }
}

async function main() {
  console.log(chalk.white('Searching for i18next config...'))

  const translations = await collectTranslations()
  const unused = await checkUsage(translations)
  printResults(unused)

  // Return 1 if unused translations are found.
  process.exit(unused.length == 0 ? 0 : 1)
}

yargs
  .scriptName('reacti18-next-cleaner')
  .usage('$0 <cmd>')
  .command('*', 'scan your project for unused translations', main)
  .help().argv
