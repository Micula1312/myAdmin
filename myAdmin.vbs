Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "C:\\Users\\micol\\repository\\myADMIN"
shell.Run "pythonw server.py", 0, False
