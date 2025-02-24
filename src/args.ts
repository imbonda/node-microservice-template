// 3rd party.
import { program, Option, Command } from 'commander';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ParsedArgs {
    /** Add commands here. */
}

interface CommandDefinition {
    name: string;
    description: string;
    action?: (parsedAccum: ParsedArgs, parsedOptions: object) => void;
    options?: {
        mandatory: boolean;
        flags: string;
        description: string;
        choices?: string[];
    }[];
    subcommands?: CommandDefinition[];
}

const commands: CommandDefinition[] = [
    /** Add commands here. */
];

let alreadyParsed: boolean = false;
const parsed: ParsedArgs = {};

export function cmdArgs(): ParsedArgs {
    if (!alreadyParsed) {
        alreadyParsed = true;
        commands.forEach((def) => program.addCommand(createCommand(def)));
        program.parse();
    }
    return parsed;
}

function createCommand(cmdDef: CommandDefinition): Command {
    const cmd = new Command(cmdDef.name).description(cmdDef.description);
    if (cmdDef.action) {
        cmd.action((parsedOptions) => cmdDef.action(parsed, parsedOptions));
    }
    (cmdDef.options || []).forEach((optionDef) => {
        let option = new Option(optionDef.flags, optionDef.description);
        if (optionDef.choices) {
            option = option.choices(optionDef.choices);
        }
        if (optionDef.mandatory) {
            option = option.makeOptionMandatory();
        }
        cmd.addOption(option);
    });
    const subcommands = (cmdDef.subcommands || []).map(createCommand);
    subcommands.forEach(cmd.addCommand.bind(cmd));
    return cmd;
}
