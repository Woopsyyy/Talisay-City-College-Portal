import React from "react";
import styled from "styled-components";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const LOTTIE_404_SRC =
  "https://lottie.host/2bc99da7-ae2b-43d7-8e95-27b41ae4d6cd/mroLhonjUu.json";

const PortalOutageScreen = () => {
  return (
    <OutageCanvas>
      <AnimationWrap>
        <DotLottieReact src={LOTTIE_404_SRC} loop autoplay />
      </AnimationWrap>
    </OutageCanvas>
  );
};

const OutageCanvas = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999999;
  display: block;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 8%, rgba(95, 162, 255, 0.2), transparent 38%),
    radial-gradient(circle at 88% 10%, rgba(124, 91, 255, 0.2), transparent 38%),
    linear-gradient(145deg, #040812 0%, #050c1e 44%, #050914 100%);
  color: #eef4ff;
`;

const AnimationWrap = styled.div`
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  margin: 0;

  > div,
  canvas,
  svg {
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    max-height: none !important;
    display: block;
    object-fit: cover;
  }
`;

export default PortalOutageScreen;
