import pickle

print("Loading encodings...")

with open("EncodeFile.p", "rb") as f:
    encodeListKnown, studentIds = pickle.load(f)

print("Encodings loaded:", len(studentIds))
