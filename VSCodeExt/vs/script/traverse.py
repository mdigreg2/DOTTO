import json
import PySimpleGUI as sg

class Traverse:
	def __init__(self, path):
		self.path = path
	def search(self, path):
		#load command dict
		print('Beginning search process...')
		commands = json.load(open(path))

		sg.LOOK_AND_FEEL_TABLE['reScribe'] = {'BACKGROUND': '#4D4D4D',
												'TEXT': '#3CA0F4',
												'INPUT': '#FFFFFF',
												'TEXT_INPUT': '#707070',
												'SCROLL': '#3CA0F4',
												'BUTTON': ('#3CA0F4', '#707070'),
												'PROGRESS': ('#3CA0F4', '707070'),
												'BORDER': 1, 'SLIDER_DEPTH': 0, 'PROGRESS_DEPTH': 0,
                                        }

		sg.theme('reScribe')   # Make Window in dark mode

		#Create the layout of the window
		col = []
		commandList = [[k,v] for (k, v) in commands.items()]

		for (k, v) in commands.items():
			col += [[sg.Button(k, key = k, size = (10,1))]]



		layout = [  [sg.Text('//..reScribe'), sg.InputText(), sg.Button('Search')],
					[sg.Column(col), sg.Text('Choose a command from the left to see the format and what it produces. \nAlternatively you can use the search bar above to search for a command', key = '_display_', size = (40,10))],
					[sg.Button('Close')] ]

		# Create the Window
		window = sg.Window('reScribe Search', layout)
		# Event Loop to process "events" and get the "values" of the inputs
		#set command window to not be active
		cw_active = False
		while True:
			event, values = window.read()
			if event in (None, 'Close'):   # if user closes window or clicks cancel
				break
			elif event in 'Search':
				print('Searching for commmand: ', values[0])
				found = False
				#search for request in command dict
				for (k, v) in commandList:
					if values[0] == k:
						found = True
						output = 'Command:\n //..' + k + '\n' + 'Arguments: \n' + 'Code:\n' + v
						break
				if found:
					print("Command found!")
					window['_display_'].update(str(output))
			for k in commandList:
				if event in k[0]:
					output = 'Command:\n //..' + k[0] + '\n' + 'Arguments: \n' + 'Code:\n' + k[1]
					window['_display_'].update(str(output))

		window.close()
		return
