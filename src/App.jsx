import { useEffect, useState, useRef, useCallback } from 'react'

import './App.css'

// CONSTANTS
const BOARD_WIDTH = 750
const BOARD_HEIGHT = 375
const BALL_START_POSITION = { x: 375, y: 100 }
const GROUND_LEVEL = 300
const GOAL_HEIGHT = 100
const STARTING_POSITION_X_OFFSET = 100
const LEFT_SLIME_START_POSITION = { x: STARTING_POSITION_X_OFFSET, y: GROUND_LEVEL }
const RIGHT_SLIME_START_POSITION = { x: BOARD_WIDTH - STARTING_POSITION_X_OFFSET, y: GROUND_LEVEL }
const GRAVITY = -1.5
const SLIME_SPEED = 8
const SLIME_JUMP_SPEED = 20
const SLIME_RADIUS = 40
const BALL_RADIUS = 10

let innerProduct = (v1, v2) => {
    return v1.x * v2.x + v1.y * v2.y
}

let vectorSub = (v1, v2) => {
    return {x: v1.x - v2.x, y: v1.y - v2.y}
}

let vectorAdd = (v1, v2) => {
    return {x: v1.x + v2.x, y: v1.y + v2.y}
}

let scalarProduct = (c, v) => {
    return {x: c*v.x, y: c*v.y}
}

let getAngle = (p1, p2) => {
    let dx = Math.abs(p2.x - p1.x)
    let dy = Math.abs(p2.y - p1.y)
    return Math.atan(dy/dx)
}

const getNewBallVelocity = (ballVelocity, ballPosition, collisionObjectVelocity, CollisionObjectPosition, factor=1.8) => {
    let velocitySub = vectorSub(ballVelocity, collisionObjectVelocity)
    let positionSub = vectorSub(ballPosition, CollisionObjectPosition)
    let velocityDelta = scalarProduct(-factor*innerProduct(velocitySub, positionSub)/innerProduct(positionSub, positionSub), positionSub)
    let newVelocity = vectorAdd(ballVelocity, velocityDelta)
    return newVelocity
}

const Canvas = (props) => {
    // LEFT SLIME 
    const [leftSlimePosition, setLeftSlimePosition] = useState(LEFT_SLIME_START_POSITION);
    const [leftSlimeVelocity, setLeftSlimeVelocity] = useState({x: 0, y: 0});
    const leftSlimeInJump = useRef(false);
    
    // RIGHT SLIME
    const [rightSlimePosition, setRightSlimePosition] = useState(RIGHT_SLIME_START_POSITION);
    const [rightSlimeVelocity, setRightSlimeVelocity] = useState({x: 0, y: 0});
    const rightSlimeInJump = useRef(false);

    // BALL
    const [ballPosition, setBallPosition] = useState(BALL_START_POSITION);
    const [ballVelocity, setBallVelocity] = useState({x: 0, y: 0});

    // SCORE
    const [leftScore, setLeftScore] = useState(0);
    const [rightScore, setRightScore] = useState(0);

    // ANIMATION
    const animationFrameId = useRef(null);
    const animate = useCallback(() => {
        // new state
        let newLeftSlimeVelocity = {x: leftSlimeVelocity.x, y: leftSlimeVelocity.y}
        let newLeftSlimePosition = {x: leftSlimePosition.x, y: leftSlimePosition.y}
        let newRightSlimeVelocity = {x: rightSlimeVelocity.x, y: rightSlimeVelocity.y}
        let newRightSlimePosition = {x: rightSlimePosition.x, y: rightSlimePosition.y}
        let newBallVelocity = {x: ballVelocity.x, y: ballVelocity.y}
        let newBallPosition = {x: ballPosition.x, y: ballPosition.y}

        // derive new velocities based on prev state
        if (leftSlimeInJump.current) {
            if (leftSlimePosition.y === GROUND_LEVEL && leftSlimeVelocity.y > 0 ) {
                leftSlimeInJump.current = false;
                newLeftSlimeVelocity.y = 0
            }
            newLeftSlimeVelocity.y = newLeftSlimeVelocity.y - GRAVITY
        } else {
            newLeftSlimeVelocity.y = newLeftSlimeVelocity.y
        }
        if (rightSlimeInJump.current) {
            if (rightSlimePosition.y === GROUND_LEVEL && rightSlimeVelocity.y > 0 ) {
                rightSlimeInJump.current = false;
                newRightSlimeVelocity.y = 0
            }
            newRightSlimeVelocity.y = newRightSlimeVelocity.y - GRAVITY
        } else {
            newRightSlimeVelocity.y = newRightSlimeVelocity.y
        }
        const leftSlimeCollision = (ballPosition.y <= leftSlimePosition.y) && (Math.pow((ballPosition.x - leftSlimePosition.x),2) + Math.pow((ballPosition.y - leftSlimePosition.y),2) <= Math.pow(SLIME_RADIUS + BALL_RADIUS, 2))
        const rightSlimeCollision = (ballPosition.y <= rightSlimePosition.y) && (Math.pow((ballPosition.x - rightSlimePosition.x),2) + Math.pow((ballPosition.y - rightSlimePosition.y),2) <= Math.pow(SLIME_RADIUS + BALL_RADIUS, 2))
        if (ballPosition.y + BALL_RADIUS >= GROUND_LEVEL ) { // detect collision ground
            newBallVelocity = getNewBallVelocity(ballVelocity, ballPosition, {x: 0, y: 0}, {x: ballPosition.x, y: GROUND_LEVEL})
            // uncomment this to make the ball not jitter
            // newBallVelocity.y = newBallVelocity.y + 0.6
        } 
        else if (ballPosition.x >= BOARD_WIDTH - BALL_RADIUS) { // detect collision with right wall
            if (ballPosition.y >= GROUND_LEVEL - GOAL_HEIGHT && ballPosition.y <= GROUND_LEVEL ) {
                setLeftScore(prevScore => prevScore + 1)
            }
            newBallVelocity = getNewBallVelocity(ballVelocity, ballPosition, {x: 0, y: 0}, {x: BOARD_WIDTH, y: ballPosition.y})
        }
        else if (ballPosition.x <= BALL_RADIUS) { // detect collision with left wall
            if (ballPosition.y >= GROUND_LEVEL - GOAL_HEIGHT && ballPosition.y <= GROUND_LEVEL ) {
                setRightScore(prevScore => prevScore + 1)
            }
            newBallVelocity = getNewBallVelocity(ballVelocity, ballPosition, {x: 0, y: 0}, {x: 0, y: ballPosition.y})
        }
        else if (leftSlimeCollision) { // detect collision with left slime
            newBallVelocity = getNewBallVelocity(ballVelocity, ballPosition, leftSlimeVelocity, leftSlimePosition)
        }
        else if (rightSlimeCollision) { // detect collision with right slime
            newBallVelocity = getNewBallVelocity(ballVelocity, ballPosition, rightSlimeVelocity, rightSlimePosition)
        } else {
            newBallVelocity.y = newBallVelocity.y - GRAVITY
        }
        

        // apply air resistance to ball
        const resistanceFactor = 0.0005
        newBallVelocity.x = newBallVelocity.x - Math.sign(newBallVelocity.x) * Math.pow(newBallVelocity.x, 2) * resistanceFactor
        newBallVelocity.y = newBallVelocity.y - Math.sign(newBallVelocity.y) * Math.pow(newBallVelocity.y, 2) * resistanceFactor

        setLeftSlimeVelocity(prevVelocity => {
            return newLeftSlimeVelocity
        }); 

        setRightSlimeVelocity(prevVelocity => {
            return newRightSlimeVelocity
        });

        setBallVelocity(prevVelocity => {
            return {x: newBallVelocity.x, y: newBallVelocity.y}
        }); 

        // derive new positions based on prev positions and new velocities
        newLeftSlimePosition.x = newLeftSlimePosition.x + newLeftSlimeVelocity.x
        newLeftSlimePosition.x = Math.max(newLeftSlimePosition.x, SLIME_RADIUS)
        newLeftSlimePosition.x = Math.min(newLeftSlimePosition.x, BOARD_WIDTH - SLIME_RADIUS)
        newLeftSlimePosition.y = Math.min(newLeftSlimePosition.y + newLeftSlimeVelocity.y, GROUND_LEVEL)

        newRightSlimePosition.x = newRightSlimePosition.x + newRightSlimeVelocity.x
        newRightSlimePosition.x = Math.max(newRightSlimePosition.x, SLIME_RADIUS)
        newRightSlimePosition.x = Math.min(newRightSlimePosition.x, BOARD_WIDTH - SLIME_RADIUS)
        newRightSlimePosition.y = Math.min(newRightSlimePosition.y + newRightSlimeVelocity.y, GROUND_LEVEL)
        
        if (leftSlimeCollision) {
            let angle = getAngle(leftSlimePosition, ballPosition)
            let dx = (SLIME_RADIUS + BALL_RADIUS + 3)*Math.cos(angle)
            let dy = (SLIME_RADIUS + BALL_RADIUS + 3)*Math.sin(angle)
            if (ballPosition.x < newLeftSlimePosition.x) {
                dx = -dx
            }
            newBallPosition.x = newLeftSlimePosition.x + dx
            newBallPosition.y = newLeftSlimePosition.y - dy
        }  else if (rightSlimeCollision) {
            let angle = getAngle(rightSlimePosition, ballPosition)
            let dx = (SLIME_RADIUS + BALL_RADIUS + 3)*Math.cos(angle)
            let dy = (SLIME_RADIUS + BALL_RADIUS + 3)*Math.sin(angle)
            if (ballPosition.x < newRightSlimePosition.x) {
                dx = -dx
            }
            newBallPosition.x = newRightSlimePosition.x + dx
            newBallPosition.y = newRightSlimePosition.y - dy
        } else {
            newBallPosition.x = ballPosition.x + newBallVelocity.x
            newBallPosition.y = ballPosition.y + newBallVelocity.y
        }

        // prevent ball from going out of bounds
        if (newBallPosition.x <= BALL_RADIUS) {
            newBallPosition.x = BALL_RADIUS
        }
        if (newBallPosition.x >= BOARD_WIDTH - BALL_RADIUS) {
            newBallPosition.x = BOARD_WIDTH - BALL_RADIUS
        }
        newBallPosition.y = Math.min(newBallPosition.y, GROUND_LEVEL - BALL_RADIUS)
        
        setBallPosition(prevPosition => {
            return newBallPosition
        });

        setLeftSlimePosition(prevPosition => {
            return newLeftSlimePosition
        });

        setRightSlimePosition(prevPosition => {
            return newRightSlimePosition
        });


        // Continue the animation loop if moving
        if (leftSlimeVelocity.x != 0 || leftSlimeInJump.current || rightSlimeVelocity.x != 0 || rightSlimeInJump.current) {
            animationFrameId.current = requestAnimationFrame(animate);
        } else {
            // If stationary, cancel the animation loop
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
        
    }, [leftSlimeVelocity, rightSlimeVelocity, ballVelocity]); // Dependencies for useCallback

    useEffect(() => {
        const handleKeyDown = (event) => {
            // Prevent multiple key presses from initiating multiple animations
            if (event.repeat) return;

            // LEFT SLIME
            if (event.key === 'a') {
                cancelAnimationFrame(animationFrameId.current);
                setLeftSlimeVelocity(prevVelocity => ({...prevVelocity, x: -SLIME_SPEED}))
            } else if (event.key === 'd') {
                cancelAnimationFrame(animationFrameId.current);
                setLeftSlimeVelocity(prevVelocity => ({...prevVelocity, x: SLIME_SPEED}))
            } else if (event.key === 'w' && !leftSlimeInJump.current) {
                cancelAnimationFrame(animationFrameId.current);
                leftSlimeInJump.current = true;
                setLeftSlimeVelocity(prevVelocity => ({...prevVelocity, y: -SLIME_JUMP_SPEED}))
            }
            
            // RIGHT SLIME
            if (event.key === 'ArrowLeft') {
                cancelAnimationFrame(animationFrameId.current);
                setRightSlimeVelocity(prevVelocity => ({...prevVelocity, x: -SLIME_SPEED}))
            } else if (event.key === 'ArrowRight') {
                cancelAnimationFrame(animationFrameId.current);
                setRightSlimeVelocity(prevVelocity => ({...prevVelocity, x: SLIME_SPEED}))
            } else if (event.key === 'ArrowUp' && !rightSlimeInJump.current) {
                cancelAnimationFrame(animationFrameId.current);
                rightSlimeInJump.current = true;
                setRightSlimeVelocity(prevVelocity => ({...prevVelocity, y: -SLIME_JUMP_SPEED}))
            }
        };

        const handleKeyUp = (event) => {
            if (event.key === 'a') {
                setLeftSlimeVelocity(prevVelocity => ({...prevVelocity, x: Math.max(prevVelocity.x, 0)}))
            }
            if (event.key === 'd') {
                setLeftSlimeVelocity(prevVelocity => ({...prevVelocity, x: Math.min(prevVelocity.x, 0)}))
            }
            if (event.key === 'ArrowLeft') {
                setRightSlimeVelocity(prevVelocity => ({...prevVelocity, x: Math.max(prevVelocity.x, 0)}))
            }
            if (event.key === 'ArrowRight') {
                setRightSlimeVelocity(prevVelocity => ({...prevVelocity, x: Math.min(prevVelocity.x, 0)}))
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, []);

    useEffect(() => {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = requestAnimationFrame(animate);
    }, [leftSlimeVelocity, leftSlimeInJump, rightSlimeVelocity, rightSlimeInJump, animate]); // Dependencies for this effect
    
    const drawSlimes = (canvas, context, leftSlimePosition, rightSlimePosition, ballPosition, leftScore, rightScore) => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // draw ground
        context.beginPath()
        context.rect(0, GROUND_LEVEL, BOARD_WIDTH, BOARD_HEIGHT - GROUND_LEVEL)
        context.stroke();

        // draw goal posts
        context.beginPath()
        context.rect(0, GROUND_LEVEL - GOAL_HEIGHT, 20, GOAL_HEIGHT)
        context.rect(BOARD_WIDTH - 20, GROUND_LEVEL - GOAL_HEIGHT, 20, GOAL_HEIGHT)
        context.stroke();

        // draw left slime
        context.beginPath()
        context.arc(leftSlimePosition.x, leftSlimePosition.y, SLIME_RADIUS, 0,  Math.PI, true);
        context.lineTo(leftSlimePosition.x + SLIME_RADIUS, leftSlimePosition.y )
        context.stroke();

        // draw right slime
        context.beginPath()
        context.arc(rightSlimePosition.x, rightSlimePosition.y, SLIME_RADIUS, 0,  Math.PI, true);
        context.lineTo(rightSlimePosition.x + SLIME_RADIUS, rightSlimePosition.y )
        context.stroke();

        // draw ball
        context.beginPath()
        context.arc(ballPosition.x, ballPosition.y, BALL_RADIUS, 0,  2*Math.PI, true);
        context.stroke();

        // draw score
        context.beginPath()
        context.font = '20px Arial';
        context.fillText(leftScore, 100, 50);
        context.fillText(rightScore, 650, 50);
        context.stroke();
    }
    useEffect( () => {
        const canvas = props.ref.current
        const context = canvas.getContext('2d')
        drawSlimes(canvas, context, leftSlimePosition, rightSlimePosition, ballPosition, leftScore, rightScore)
    }, [props.ref, leftSlimePosition, rightSlimePosition, ballPosition, leftScore, rightScore])

    return <canvas ref={props.ref} id='board' width={BOARD_WIDTH} height={BOARD_HEIGHT} style={{border:'2px solid black'}}></canvas>
}

const App = () => {
    const ref = useRef(null)
    
    return (<div style={{margin: 'auto', width: '50%'}}>
        <Canvas ref={ref}></Canvas>
        <div style={{textAlign: 'center', marginTop: '20px', fontFamily: 'Arial, sans-serif'}}>
            <p>Use WAD to move left slime</p>
            <p>Use arrow keys to move right slime</p>
        </div>
    </div>)
}

export default App
