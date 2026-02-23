import React from 'react';
import styled from 'styled-components';

const SkeletonLoader = () => {
  return (
    <StyledWrapper>
      <div className="loader">
        <div className="wrapper">
          <div className="circle" />
          <div className="line-1" />
          <div className="line-2" />
          <div className="line-3" />
          <div className="line-4" />
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .loader {
    position: relative;
    width: 100%;
    max-width: 600px;
    height: 180px;
    margin: 20px auto;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 24px;
    background-color: #f5f5f5;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  .loader:after {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background: linear-gradient(110deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0) 60%, rgba(255, 255, 255, 0) 100%);
    animation: gradient-animation_2 1.5s linear infinite;
  }

  .loader .wrapper {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .loader .wrapper > div {
    background-color: #e0e0e0;
    border-radius: 4px;
  }

  .loader .circle {
    width: 60px;
    height: 60px;
    border-radius: 50% !important;
  }

  .loader .line-1 {
    position: absolute;
    top: 10px;
    left: 80px;
    height: 16px;
    width: 120px;
  }

  .loader .line-2 {
    position: absolute;
    top: 36px;
    left: 80px;
    height: 12px;
    width: 200px;
  }

  .loader .line-3 {
    position: absolute;
    top: 85px;
    left: 0px;
    height: 12px;
    width: 100%;
  }

  .loader .line-4 {
    position: absolute;
    top: 110px;
    left: 0px;
    height: 12px;
    width: 85%;
  }

  @keyframes gradient-animation_2 {
    0% {
      transform: translateX(-100%);
    }

    100% {
      transform: translateX(100%);
    }
  }`;

export default SkeletonLoader;
