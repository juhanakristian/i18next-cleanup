import fs from "fs"
import util from "util"
import yargs, { Arguments } from "yargs"

import glob from "glob"

const globAsync = util.promisify(glob)

interface CLIArguments {
  find: boolean
}

async function list() {
  return globAsync("**/*.(js|ts)", {
    cwd: ".",
  })
}

async function findConfig() {
  const files = await list()
  console.log(files)
}

/*
Find reacti18-next config, read translations and key separators etc.
*/
async function main(args: CLIArguments) {
  console.log("Finding unused translations...")
  await findConfig()
  if (args.find) {
    // Find i18next config
    // read keys
    // traverse project to find if keys are used
  }
}

yargs
  .scriptName("react18i-next-cleaner")
  .usage("$0 <cmd> [args]")
  .command(
    "*",
    "scan your project for unused translations",
    (yargs) => {
      yargs.option("find", {})
    },
    function (argv: Arguments<CLIArguments>) {
      return main({ find: argv.find })
    }
  )
  .help().argv
