import {ArgumentParser} from 'argparse';
import {Main} from "./main.js";

const parser = new ArgumentParser({
    description: "A simple program for compiling Rift of the NecroDancer chart files.",
});

parser.add_argument("file", {help: "The input chart file path."});
parser.add_argument("-o", "--out", {help: "The output chart file path.", required: true})

const main = new Main(parser.parse_args());
main.convert().catch(console.error.bind(console));