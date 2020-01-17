from pull_from_dict import load_command_dict, create_file_dict, parse_dict_for_lines_with_commands


def get_command_parameters(command_path, file_path, regular_expression):
    """
    This will return the lines of the commands, the command, and the arguments
    currently this only works for one command
    """
    try:
        file_dict = create_file_dict(file_path)
    except:
        print("Error creating the file dict")
        return
    
    try:
        command_dict = load_command_dict(command_path)
    except:
        print("Error loading the command dict")
        return 

    try:
        file_dict, command, args_raw = parse_dict_for_lines_with_commands(file_dict, regular_expression)
    except:
        print("Error parsing the file dict")
        return 

    # file_dict = create_file_dict(file_path)
    # command_dict = load_command_dict(command_path)
    # file_dict, command, args_raw = parse_dict_for_lines_with_commands(file_dict, regular_expression)
    return next(iter(file_dict)), command, args_raw[0].split(',')
    
def get_command_contents(command_path, file_path, regular_expression):
    """
    This function will return the contents of the rescribe command-to-be as a string
    """
    MAX_LINES = 500
    try:
        line_number, command, args = get_command_parameters(command_path, file_path, regular_expression)
        line_number = int(line_number) - 1
    except:
        print("Error with the function get_command_parameters")
        return 

    with open(file_path, encoding="utf-8", errors='ignore') as file:
        file_contents = file.readlines()    

        for index, line in enumerate(file_contents):
            if index < line_number:
                continue
            elif index == line_number:
                if(len(file_contents) > (line_number + MAX_LINES + 1)):
                    command_contents = grammar_parser(file_contents[line_number : (line_number + MAX_LINES)])
                    break
                else:
                    command_contents = grammar_parser(file_contents[line_number:])
                    break
            else: 
                return

    return command_contents

def grammar_parser(file_contents):
    """
    This function will take in a list of strings and return all of the characters contained within a "grammatically correct" set of curly braces
    """
    import re
    #start_delim = re.compile("")
    output = []
    grammar_stack = []
    start_delim = '{'
    end_delim = "}"
    reached_beginning = False
    reached_end = False
    for line_index, line in enumerate(file_contents):
        for character_index, character in enumerate(line):
            #if you reach the start delimiter for the first time then save the index of the start delimter and continue on 
            if (character == start_delim) and (reached_beginning == False):
                reached_beginning = True
                start = (line_index, character_index)
                #grammar_stack.append(character)
            #if you've reached the beginning but not the end then start appending characters to the stack
            if (reached_beginning == True) and (reached_end == False):
                output.append(character)
                if (character == start_delim):
                    grammar_stack.append(character)
                if (character == end_delim):

        ###PRIMARY RETURN RESIDES IN THIS "TRY" SECTION - OTHER RETURNS REPRESENT ERRORS###
                    try:
                        grammar_stack.pop()
                        if grammar_stack == []:
                            reached_end = True
                            end = (line_index, character_index)
                            return convert(output)
    
                    except:
                        reached_end = True
                        end = (line_index, character_index)
                        print("There is a syntax error in the rescribe command, check for improper curly brace usage\nReturning start and end coordinates realtive to //..\n Touple (line_number, character_number) - indexed from zero\n")
                        return start, end
            if (reached_beginning == True) and (reached_end == True):
                print("There is a syntax error in the rescribe command, check for improper curly brace usage\nReturning start and end coordinates realtive to //..\n Touple (line_number, character_number) - indexed from zero\n")
                return start, end
    print("There is a syntax error in the rescribe command, check for improper curly brace usage\nReturning start and end coordinates realtive to //..\n Touple (line_number, character_number) - indexed from zero\n")
    return start, end

def convert(s):
    output = ""
    return output.join(s)

if __name__ == "__main__":
    import re
    regexp = re.compile(r'\/\/\.\.[a-zA-Z0-9\_\-]*\([a-zA-Z0-9\_\-\,\s]*\)')
    line_numbers, commands, args = get_command_parameters("command_dict.json", "sampleCode.java", regexp)
    print("Line Numbers: ", line_numbers, " Commands: ", commands, " args: ", args)

    command_contents = get_command_contents("command_dict.json", "sampleCode.java", regexp)
    print(command_contents)