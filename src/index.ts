import yargs, { Arguments } from "yargs"

interface CLIArguments {
  find: boolean
}

function main(args: CLIArguments) {
  if (args.find) {
    console.log("Finding unused translations...")
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
