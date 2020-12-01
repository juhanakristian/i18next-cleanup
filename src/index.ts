import yargs, { Arguments } from "yargs"

interface CLIArguments {
  find: boolean
}

/*
Find reacti18-next config, read translations and key separators etc.
Scan project for 

*/
function main(args: CLIArguments) {
  if (args.find) {
    console.log("Finding unused translations...")

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
