#!/bin/bash

# Universal Push Script - Works on Windows PowerShell, Mac, and Linux

echo "=========================================="
echo "🚀 Livestock Farm Deployment Script"
echo "=========================================="

# Check if running on Windows PowerShell
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows PowerShell commands
    echo ""
    echo "📝 Enter your commit message:"
    $message = Read-Host -Prompt "Enter your commit message"
    
    if ([string]::IsNullOrEmpty($message)) {
        Write-Host "❌ Error: Commit message cannot be empty" -ForegroundColor Red
        exit 1
    }
    
    echo ""
    Write-Host "📝 Commit message: $message" -ForegroundColor Green
    echo ""
    
    Write-Host "📦 Staging changes..." -ForegroundColor Yellow
    git add .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: Failed to stage changes" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "💾 Committing changes..." -ForegroundColor Yellow
    git commit -m "$message"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: Failed to commit changes" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "📤 Pushing to remote..." -ForegroundColor Yellow
    git push origin main
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: Failed to push changes" -ForegroundColor Red
        exit 1
    }
    
    echo ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "✅ Success! Changes pushed to main branch" -ForegroundColor Green
    Write-Host "🌐 Check Vercel for deployment status" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
else
    # Unix/Linux/Mac bash commands
    echo ""
    echo "📝 Enter your commit message:"
    read message
    
    if [ -z "$message" ]; then
        echo "❌ Error: Commit message cannot be empty"
        exit 1
    fi
    
    echo ""
    echo "📝 Commit message: $message"
    echo ""
    
    echo "📦 Staging changes..."
    git add .
    
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to stage changes"
        exit 1
    fi
    
    echo "💾 Committing changes..."
    git commit -m "$message"
    
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to commit changes"
        exit 1
    fi
    
    echo "📤 Pushing to remote..."
    git push origin main
    
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to push changes"
        exit 1
    fi
    
    echo ""
    echo "=========================================="
    echo "✅ Success! Changes pushed to main branch"
    echo "🌐 Check Vercel for deployment status"
    echo "=========================================="
fi
