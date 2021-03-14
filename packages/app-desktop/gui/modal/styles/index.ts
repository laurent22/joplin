import styled from 'styled-components';

export const RootStyle = styled.div`
    background-color: ${props => props.theme.color};
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    transition: 200ms opacity;
    bottom: 0;
    left: 0;
    overflow: auto;
    padding: 20px;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 100;
`;

export const StyledHeader = styled.header`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 500px;
    user-select: none;
    color: #333;
    font-size: 120%;
    font-weight: bold;
    margin: 0;
    padding: 14px 17px;
    text-shadow: white 0 1px 2px;
`;

export const StyledContentArea = styled.div`
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 6px 17px;
    position: relative;
`;

export const StyledActionArea = styled.div`
    padding: 14px 17px;
`;

export const StyledInput = styled.input`
    width: 100%;
    border: 1px solid #bfbfbf;
    border-radius: 2px;
    box-sizing: border-box;
    font: inherit;
    margin: 0;
    margin-top: 1em;
    min-height: 2em;
    padding: 3px;
    outline: none;
    &:enabled:focus {
        transition: border-color 200ms;
        border-color: rgb(77, 144, 254);
        outline: none;
    }
`;

export const StyledButonStrip = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
`;

export const StyledPage = styled.div`
    max-width: 30em;
    border-radius: 3px;
    background: white;
    box-shadow: 0 4px 23px 5px rgba(0, 0, 0, .2), 0 2px 6px rgba(0, 0, 0, .15);
    color: #333;
    min-width: 400px;
    padding: 0;
    position: relative;
    z-index: 0;
`;

export const StyledButton = styled.button`
    min-height: 2em;
    min-width: 4em;
    appearance: none;
    user-select: none;
    background-image: linear-gradient(#ededed, #ededed 38%, #dedede);
    border: 1px solid rgba(0, 0, 0, 0.25);
    border-radius: 2px;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.75);
    color: #444;
    font: inherit;
    margin: 0 1px 0 10px;
    text-shadow: 0 1px 0 rgb(240, 240, 240);
    &::-moz-focus-inner{
        border: 0;
    }
    &:enabled:active {
        background-image: linear-gradient(#e7e7e7, #e7e7e7 38%, #d7d7d7);
        box-shadow: none;
        text-shadow: none;
    }
    &:enabled:focus {
        transition: border-color 200ms;
        border-color: rgb(77, 144, 254);
        outline: none;
    }
`;

export const StyledCloseButton = styled.div`
    background-position: center;
    background-repeat: no-repeat;
    height: 14px;
    position: absolute;
    right: 7px;
    top: 7px;
    width: 14px;
    z-index: 1;
`;

export const StyledProgress = styled.div`
    display: block;
    width: 100%;
`;
