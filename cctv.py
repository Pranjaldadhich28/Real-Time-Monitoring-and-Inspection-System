import cv2

# Phone ka IP Webcam HTTP video URL
url = "http://192.168.29.33:8080/video"
cap = cv2.VideoCapture(url)

if not cap.isOpened():
    print("Error: Phone feed se connect nahi ho pa raha hai!")
    exit()

print("CCTV Feed live ho gayi hai! Band karne ke liye 'q' dabayein.")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Frame nahi mil raha hai.")
        break

    # Video feed ko window mein dikhayein
    cv2.imshow("Phone CCTV Feed", frame)

    # 'q' key dabane par window band ho jayegi
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()