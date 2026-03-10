import pickle

# Load the pickle file
with open("EncodeFile.p", "rb") as f:
    data = pickle.load(f)

# Print type and preview
print(type(data))       # See what kind of object it is (list, dict, etc.)
print(len(data))        # If it’s a list/dict, see how many elements
print(data)             # Print the actual content (may be large)
