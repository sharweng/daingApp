import { CameraView } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";

export const takePicture = async (
  cameraRef: React.RefObject<CameraView | null>
): Promise<string | null> => {
  if (cameraRef.current) {
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo) {
        // Resize to save bandwidth
        const manipulated = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        return manipulated.uri;
      }
    } catch (error) {
      console.error("Camera Error:", error);
    }
  }
  return null;
};
