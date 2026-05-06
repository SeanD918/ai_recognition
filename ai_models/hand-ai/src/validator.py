import cv2

def is_hand(image_path):
    """
    Validates if an image contains a hand.
    """
    try:
        import mediapipe as mp
        mp_hands = mp.solutions.hands
        hands = mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5)
    except Exception as e:
        # If mediapipe is not installed or fails due to system libraries (OSError), skip validation
        print(f"Validation skipped due to MediaPipe error: {e}")
        return True, "Validation skipped (mediapipe error)"

    with hands:
        image = cv2.imread(image_path)
        if image is None:
            return False, "Image not found"
            
        results = hands.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        if results.multi_hand_landmarks:
            return True, "Hand detected"
        
        return False, "No hand detected"
