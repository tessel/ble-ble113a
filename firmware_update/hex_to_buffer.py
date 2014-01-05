#!/usr/bin/python

import sys
import argparse
import csv


def parseCLArguments():

	parser = argparse.ArgumentParser(description='Convert a BlueGiga .hex file into Node.js Module file.')

	parser.add_argument('input', metavar='input file', type=argparse.FileType('r'), nargs='?',
	               help='The input .hex file')

	parser.add_argument('-output', metavar='output file', type=argparse.FileType('w'), nargs='?',
	               help='The optional output Node.js file name. Default is ble-firmware.js', default="ble-firmware.js")

	args = parser.parse_args()

	return args

def extractHexData(inputFile):

	commands = []

	data = []

	beginRecording = False;

	for line in csv.reader(inputFile, delimiter=' '):
		if (line[0]):
			commands.append(makeFlashCommand(line[0]))

	for command in commands:
		# The first data starts at memory location 0x1000
		if (beginRecording == False and command.recordType == 0x00 and (command.address == int("1000", 16))):

			# Tell the loop to start recording
			beginRecording = True;

		# If we have a data command and are ready to start recording
		if (beginRecording and command.recordType == 0x0):
			for i in range(command.byteCount) :
				data.append(command.data[i])

	inputFile.close()

	return data

def makeFlashCommand(hexLine):

	command = FlashCommand();
	exceptionText = "Invalid Hex Format!"


	if (hexLine[0] != ':'):
		raise Exception(exceptionText)

	try:
		command.raw = hexLine
		command.byteCount = int(hexLine[1:3], 16)
		command.address = int(hexLine[3:7], 16);
		command.recordType = int(hexLine[7:9], 16)

		# Start reading at index 9
		startIndex = 9;

		# If this command has data
		if (command.byteCount):

			# Iterate through the data
			for i in range(command.byteCount):

				# We want to put each two digits together
				dataIndex = startIndex + (i * 2)

				# Append the two digits converted to a base 16 int
				command.data.append(int(hexLine[dataIndex : dataIndex + 2], 16))

		# Add the checksum
		endIndex = startIndex + (command.byteCount*2)
		command.checkSum = hexLine[endIndex:endIndex+2]

	except IndexError:
		raise Exception(exceptionText)


	return command


class FlashCommand():
	def __init__(self):
		self.data = []
		self.byteCount = 0;
		self.recordType = 0;
		self.address = [];
		self.checkSum = 0;
		self.raw = ""



def generateNodeFile(outputFile, buffer):
	print ("Generating File with buffer length: " + str(len(buffer)))
	outputFile.write("module.exports=" + str(buffer) + ";\n")
	outputFile.close();
	print ("All Finished!")
 
def main():
	# Pull out the command line arguments to get input and output file
	args = parseCLArguments()

	# Extract data bytes from input file
	buf = extractHexData(args.input)

	# Open output file, write module with buffer
	generateNodeFile(args.output, buf)

main()